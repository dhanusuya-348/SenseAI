"""Arena HTTP + WebSocket routes."""
import uuid
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, List
from api.db.arena import (
    ensure_arena_tables,
    get_leaderboard,
    get_recent_battles,
    create_battle,
)
from api.db.course import get_course
from api.services.question_generator import generate_questions, build_content_summary
from api.services.arena_engine import (
    enqueue_player,
    dequeue_player,
    active_battles,
    spectators,
    user_to_battle,
    BattleState,
    start_next_round,
    handle_answer,
    safe_send,
    broadcast_to_battle,
)

router = APIRouter()

# Ensure tables on first import
import asyncio as _asyncio


# ── HTTP endpoints ─────────────────────────────────────────────────────────────

@router.get("/leaderboard/{cohort_id}")
async def arena_leaderboard(cohort_id: int):
    await ensure_arena_tables()
    return await get_leaderboard(cohort_id)


@router.get("/battles/{cohort_id}/recent")
async def recent_battles(cohort_id: int):
    await ensure_arena_tables()
    return await get_recent_battles(cohort_id)


@router.get("/battles/active")
async def list_active_battles():
    """Return a summary of all in-progress battles for spectating."""
    result = []
    for bid, battle in active_battles.items():
        result.append(
            {
                "battle_id": bid,
                "module_name": battle.module_name,
                "cohort_id": battle.cohort_id,
                "player1_name": battle.player1["user_name"],
                "player2_name": battle.player2["user_name"],
                "round": battle.current_round + 1,
                "total_rounds": battle.total_rounds,
                "p1_score": battle.p1_score,
                "p2_score": battle.p2_score,
                "spectator_count": len(spectators.get(bid, set())),
            }
        )
    return result


# ── WebSocket: player ──────────────────────────────────────────────────────────

@router.websocket("/ws/player")
async def arena_player_ws(websocket: WebSocket):
    """
    Main player WebSocket. Handles matchmaking and battle messages.
    Query params expected: user_id, user_name, cohort_id, module_id, module_name, difficulty
    """
    await ensure_arena_tables()
    await websocket.accept()

    params = websocket.query_params
    try:
        user_id = int(params.get("user_id"))
        user_name = params.get("user_name", f"Player {user_id}")
        cohort_id = int(params.get("cohort_id"))
        module_id = int(params.get("module_id"))
        module_name = params.get("module_name", "Module")
        difficulty = params.get("difficulty", "medium")
    except (TypeError, ValueError):
        await websocket.send_json({"type": "error", "message": "Invalid connection parameters"})
        await websocket.close()
        return

    player = {"user_id": user_id, "user_name": user_name, "ws": websocket}
    battle: BattleState = None

    try:
        # ── Matchmaking ────────────────────────────────────────────────────
        await websocket.send_json({"type": "waiting", "message": "Looking for an opponent..."})
        opponent = enqueue_player(cohort_id, module_id, player)

        if opponent is None:
            # Waiting for match — keep alive until matched or disconnect
            while True:
                data = await websocket.receive_json()
                if data.get("type") == "cancel":
                    dequeue_player(cohort_id, module_id, user_id)
                    await websocket.send_json({"type": "cancelled"})
                    return
                # Check if we got matched (another player may have matched us)
                if user_id in user_to_battle:
                    battle = active_battles[user_to_battle[user_id]]
                    break
            if battle is None:
                return
        else:
            # ── Match found — generate questions ──────────────────────────
            await websocket.send_json({
                "type": "generating",
                "message": "Match found! Generating questions with AI...",
            })
            await safe_send(opponent["ws"], {
                "type": "generating",
                "message": "Match found! Generating questions with AI...",
            })

            # Fetch course content for this module
            try:
                # Get tasks for summarization — use module_id directly
                from api.utils.db import execute_db_operation
                tasks_raw = await execute_db_operation(
                    """SELECT t.title, t.type FROM course_tasks ct
                       JOIN tasks t ON ct.task_id = t.id
                       WHERE ct.milestone_id = ? AND t.deleted_at IS NULL
                       LIMIT 30""",
                    (module_id,),
                    fetch_all=True,
                )
                tasks = [{"title": r[0], "type": r[1]} for r in (tasks_raw or [])]
                content_summary = build_content_summary(tasks) or module_name
            except Exception:
                content_summary = module_name

            questions = await generate_questions(module_name, content_summary, difficulty)

            # Determine player1 / player2 (opponent was waiting first)
            p1, p2 = opponent, player

            db_battle_id = await create_battle(
                p1["user_id"], p2["user_id"], module_id, module_name, cohort_id, questions
            )

            battle_id = str(uuid.uuid4())
            battle = BattleState(
                battle_id=battle_id,
                db_battle_id=db_battle_id,
                player1=p1,
                player2=p2,
                questions=questions,
                module_id=module_id,
                module_name=module_name,
                cohort_id=cohort_id,
            )
            active_battles[battle_id] = battle
            spectators[battle_id] = set()
            user_to_battle[p1["user_id"]] = battle_id
            user_to_battle[p2["user_id"]] = battle_id

            # Notify both players
            start_msg = {
                "type": "match_found",
                "battle_id": battle_id,
                "opponent_name": p1["user_name"],  # from p2's perspective
                "your_role": "player2",
                "module_name": module_name,
                "total_rounds": len(questions),
            }
            await safe_send(p2["ws"], start_msg)

            start_msg_p1 = {**start_msg, "opponent_name": p2["user_name"], "your_role": "player1"}
            await safe_send(p1["ws"], start_msg_p1)

            # Start the first round
            await asyncio.sleep(2)
            await start_next_round(battle)

        # ── In-battle message loop ─────────────────────────────────────────
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "answer":
                answer_index = data.get("answer_index")
                if isinstance(answer_index, int) and battle and battle.status == "active":
                    await handle_answer(battle, user_id, answer_index)

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        # If player disconnects during battle, forfeit
        if battle and battle.status == "active":
            other = (
                battle.player2 if user_id == battle.player1["user_id"] else battle.player1
            )
            await safe_send(
                other["ws"],
                {"type": "opponent_disconnected", "message": "Your opponent disconnected. You win!"},
            )
            from api.services.arena_engine import end_battle as _end
            # Award win to other player by rigging scores
            if user_id == battle.player1["user_id"]:
                battle.p2_score = max(battle.p2_score, battle.p1_score + 1)
            else:
                battle.p1_score = max(battle.p1_score, battle.p2_score + 1)
            battle.current_round = battle.total_rounds
            await _end(battle)
        else:
            dequeue_player(cohort_id, module_id, user_id)

    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


# ── WebSocket: spectator ───────────────────────────────────────────────────────

@router.websocket("/ws/spectate/{battle_id}")
async def arena_spectate_ws(websocket: WebSocket, battle_id: str):
    await websocket.accept()

    if battle_id not in active_battles:
        await websocket.send_json({"type": "error", "message": "Battle not found or already ended"})
        await websocket.close()
        return

    battle = active_battles[battle_id]
    spectators.setdefault(battle_id, set()).add(websocket)

    # Send current state snapshot
    await websocket.send_json({
        "type": "spectate_joined",
        "battle_id": battle_id,
        "module_name": battle.module_name,
        "player1_name": battle.player1["user_name"],
        "player2_name": battle.player2["user_name"],
        "round": battle.current_round + 1,
        "total_rounds": battle.total_rounds,
        "p1_score": battle.p1_score,
        "p2_score": battle.p2_score,
    })

    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except WebSocketDisconnect:
        spectators.get(battle_id, set()).discard(websocket)
