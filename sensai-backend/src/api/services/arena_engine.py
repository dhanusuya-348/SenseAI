"""Arena engine: matchmaking queue and game state management."""
import asyncio
import time
import uuid
from typing import Dict, List, Optional, Set
from fastapi import WebSocket
import json

# ── In-memory state ──────────────────────────────────────────────────────────

# matchmaking_queue[cohort_id][module_id] = list of waiting players
# Each player entry: {"user_id": int, "user_name": str, "ws": WebSocket}
matchmaking_queue: Dict[int, Dict[int, List[Dict]]] = {}

# active_battles[battle_id] = BattleState
active_battles: Dict[str, "BattleState"] = {}

# spectators[battle_id] = set of WebSocket connections
spectators: Dict[str, Set[WebSocket]] = {}

# user_to_battle[user_id] = battle_id  (so we can look up fast)
user_to_battle: Dict[int, str] = {}


class BattleState:
    def __init__(
        self,
        battle_id: str,
        db_battle_id: int,
        player1: Dict,
        player2: Dict,
        questions: List[Dict],
        module_id: int,
        module_name: str,
        cohort_id: int,
    ):
        self.battle_id = battle_id
        self.db_battle_id = db_battle_id
        self.player1 = player1   # {"user_id", "user_name", "ws"}
        self.player2 = player2
        self.questions = questions
        self.module_id = module_id
        self.module_name = module_name
        self.cohort_id = cohort_id

        self.current_round = 0
        self.total_rounds = len(questions)
        self.p1_score = 0
        self.p2_score = 0
        self.p1_streak = 0
        self.p2_streak = 0

        # Per-round answers: {user_id: {"answer_index": int, "timestamp": float}}
        self.round_answers: Dict[int, Dict] = {}
        self.round_task: Optional[asyncio.Task] = None
        self.round_start_time: float = 0.0
        self.status = "active"  # active | complete


# ── Connection helpers ────────────────────────────────────────────────────────

async def safe_send(ws: WebSocket, data: dict):
    """Send JSON to a WebSocket, silently ignore closed connections."""
    try:
        await ws.send_json(data)
    except Exception:
        pass


async def broadcast_to_battle(battle: BattleState, data: dict):
    """Send a message to both players and all spectators."""
    await safe_send(battle.player1["ws"], data)
    await safe_send(battle.player2["ws"], data)
    for ws in list(spectators.get(battle.battle_id, set())):
        await safe_send(ws, data)


# ── Matchmaking ───────────────────────────────────────────────────────────────

def enqueue_player(cohort_id: int, module_id: int, player: Dict) -> Optional[Dict]:
    """
    Add player to the queue. If someone is already waiting on the same
    module+cohort, return that waiting player (a match is found).
    """
    if cohort_id not in matchmaking_queue:
        matchmaking_queue[cohort_id] = {}
    if module_id not in matchmaking_queue[cohort_id]:
        matchmaking_queue[cohort_id][module_id] = []

    queue = matchmaking_queue[cohort_id][module_id]

    # Don't add if already in queue
    for p in queue:
        if p["user_id"] == player["user_id"]:
            return None

    # Check for a waiting opponent
    if queue:
        opponent = queue.pop(0)
        return opponent

    queue.append(player)
    return None


def dequeue_player(cohort_id: int, module_id: int, user_id: int):
    """Remove a player from the matchmaking queue."""
    try:
        queue = matchmaking_queue[cohort_id][module_id]
        matchmaking_queue[cohort_id][module_id] = [
            p for p in queue if p["user_id"] != user_id
        ]
    except (KeyError, TypeError):
        pass


# ── Scoring ───────────────────────────────────────────────────────────────────

def calculate_points(elapsed_seconds: float, is_correct: bool, time_limit: int = 30) -> int:
    if not is_correct:
        return 0
    if elapsed_seconds <= 5:
        return 100
    if elapsed_seconds <= 15:
        return 60
    return 30


# ── Round management ──────────────────────────────────────────────────────────

async def start_next_round(battle: BattleState):
    """Send the next question to both players and start a timeout."""
    if battle.current_round >= battle.total_rounds:
        await end_battle(battle)
        return

    question = battle.questions[battle.current_round]
    battle.round_answers = {}
    battle.round_start_time = time.time()

    msg = {
        "type": "question",
        "round": battle.current_round + 1,
        "total": battle.total_rounds,
        "question": question["question"],
        "options": question["options"],
        "time_limit": 30,
    }
    await broadcast_to_battle(battle, msg)

    # Schedule timeout after 31 seconds
    if battle.round_task and not battle.round_task.done():
        battle.round_task.cancel()
    battle.round_task = asyncio.create_task(_round_timeout(battle, timeout=31))


async def _round_timeout(battle: BattleState, timeout: int):
    """Called when timer expires — resolve round with whoever answered."""
    await asyncio.sleep(timeout)
    if battle.status != "active":
        return
    if battle.current_round < battle.total_rounds:
        await resolve_round(battle)


async def handle_answer(battle: BattleState, user_id: int, answer_index: int):
    """Record a player's answer. Resolve round if both have answered."""
    if user_id in battle.round_answers:
        return  # Already answered

    elapsed = time.time() - battle.round_start_time
    battle.round_answers[user_id] = {
        "answer_index": answer_index,
        "elapsed": elapsed,
    }

    # Acknowledge receipt
    ws = (
        battle.player1["ws"]
        if user_id == battle.player1["user_id"]
        else battle.player2["ws"]
    )
    await safe_send(ws, {"type": "answer_received", "round": battle.current_round + 1})

    # If both players answered, resolve immediately
    if (
        battle.player1["user_id"] in battle.round_answers
        and battle.player2["user_id"] in battle.round_answers
    ):
        if battle.round_task:
            battle.round_task.cancel()
        await resolve_round(battle)


async def resolve_round(battle: BattleState):
    """Score the current round and broadcast results."""
    if battle.current_round >= battle.total_rounds:
        return

    question = battle.questions[battle.current_round]
    correct_index = question["correct_index"]

    p1_id = battle.player1["user_id"]
    p2_id = battle.player2["user_id"]

    p1_ans = battle.round_answers.get(p1_id)
    p2_ans = battle.round_answers.get(p2_id)

    p1_correct = p1_ans is not None and p1_ans["answer_index"] == correct_index
    p2_correct = p2_ans is not None and p2_ans["answer_index"] == correct_index

    p1_pts = calculate_points(p1_ans["elapsed"] if p1_ans else 31, p1_correct)
    p2_pts = calculate_points(p2_ans["elapsed"] if p2_ans else 31, p2_correct)

    battle.p1_score += p1_pts
    battle.p2_score += p2_pts

    await broadcast_to_battle(
        battle,
        {
            "type": "round_result",
            "round": battle.current_round + 1,
            "correct_index": correct_index,
            "p1_correct": p1_correct,
            "p2_correct": p2_correct,
            "p1_points_earned": p1_pts,
            "p2_points_earned": p2_pts,
            "p1_total": battle.p1_score,
            "p2_total": battle.p2_score,
            "p1_answer": p1_ans["answer_index"] if p1_ans else None,
            "p2_answer": p2_ans["answer_index"] if p2_ans else None,
        },
    )

    battle.current_round += 1

    # Wait 3s before next round
    await asyncio.sleep(3)
    await start_next_round(battle)


async def end_battle(battle: BattleState):
    """Finalize the battle: determine winner, award credits, update DB."""
    from api.db.arena import complete_battle, upsert_leaderboard
    from api.db.user import get_user_by_id
    from api.utils.db import execute_db_operation

    battle.status = "complete"

    p1_id = battle.player1["user_id"]
    p2_id = battle.player2["user_id"]

    if battle.p1_score > battle.p2_score:
        winner_id = p1_id
    elif battle.p2_score > battle.p1_score:
        winner_id = p2_id
    else:
        winner_id = None  # Draw

    # Credit awards
    winner_credits = 50
    loser_credits = 10

    # Award credits in DB
    if winner_id == p1_id:
        await execute_db_operation(
            "UPDATE users SET credits = credits + ? WHERE id = ?",
            (winner_credits, p1_id),
        )
        await execute_db_operation(
            "UPDATE users SET credits = credits + ? WHERE id = ?",
            (loser_credits, p2_id),
        )
        p1_won, p2_won = True, False
    elif winner_id == p2_id:
        await execute_db_operation(
            "UPDATE users SET credits = credits + ? WHERE id = ?",
            (winner_credits, p2_id),
        )
        await execute_db_operation(
            "UPDATE users SET credits = credits + ? WHERE id = ?",
            (loser_credits, p1_id),
        )
        p1_won, p2_won = False, True
    else:
        # Draw – both get loser credits
        await execute_db_operation(
            "UPDATE users SET credits = credits + ? WHERE id = ?",
            (loser_credits, p1_id),
        )
        await execute_db_operation(
            "UPDATE users SET credits = credits + ? WHERE id = ?",
            (loser_credits, p2_id),
        )
        p1_won, p2_won = False, False

    # Fetch updated credits
    p1_user = await get_user_by_id(p1_id)
    p2_user = await get_user_by_id(p2_id)
    p1_new_credits = p1_user["credits"] if p1_user else 0
    p2_new_credits = p2_user["credits"] if p2_user else 0

    # Update DB
    await complete_battle(battle.db_battle_id, winner_id, battle.p1_score, battle.p2_score)
    await upsert_leaderboard(p1_id, battle.cohort_id, p1_won, battle.p1_score, 0)
    await upsert_leaderboard(p2_id, battle.cohort_id, p2_won, battle.p2_score, 0)

    credits_p1 = winner_credits if p1_won else loser_credits
    credits_p2 = winner_credits if p2_won else loser_credits

    await broadcast_to_battle(
        battle,
        {
            "type": "battle_end",
            "winner_id": winner_id,
            "p1_final_score": battle.p1_score,
            "p2_final_score": battle.p2_score,
            "p1_credits_earned": credits_p1,
            "p2_credits_earned": credits_p2,
            "p1_new_credits": p1_new_credits,
            "p2_new_credits": p2_new_credits,
        },
    )

    # Cleanup
    user_to_battle.pop(p1_id, None)
    user_to_battle.pop(p2_id, None)
    active_battles.pop(battle.battle_id, None)
    spectators.pop(battle.battle_id, None)
