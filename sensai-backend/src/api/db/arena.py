"""Arena database operations for PvP quiz battles."""
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from api.utils.db import execute_db_operation, get_new_db_connection


async def ensure_arena_tables():
    """Create arena tables if they don't exist."""
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute("""
            CREATE TABLE IF NOT EXISTS battles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player1_id INTEGER NOT NULL,
                player2_id INTEGER NOT NULL,
                module_id INTEGER NOT NULL,
                module_name TEXT NOT NULL,
                cohort_id INTEGER NOT NULL,
                winner_id INTEGER,
                player1_score INTEGER DEFAULT 0,
                player2_score INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                questions_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
            )
        """)
        await cursor.execute("""
            CREATE TABLE IF NOT EXISTS arena_leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                cohort_id INTEGER NOT NULL,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                total_score INTEGER DEFAULT 0,
                win_streak INTEGER DEFAULT 0,
                week_start DATE NOT NULL,
                UNIQUE(user_id, cohort_id, week_start)
            )
        """)
        await conn.commit()


def _get_week_start() -> str:
    """Get the start of the current week (Monday) as YYYY-MM-DD."""
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())
    return monday.isoformat()


async def create_battle(
    player1_id: int,
    player2_id: int,
    module_id: int,
    module_name: str,
    cohort_id: int,
    questions: List[Dict],
) -> int:
    """Insert a new battle record and return its ID."""
    battle_id = await execute_db_operation(
        """INSERT INTO battles (player1_id, player2_id, module_id, module_name, cohort_id, status, questions_json)
           VALUES (?, ?, ?, ?, ?, 'active', ?)""",
        (player1_id, player2_id, module_id, module_name, cohort_id, json.dumps(questions)),
        get_last_row_id=True,
    )
    return battle_id


async def complete_battle(
    battle_id: int,
    winner_id: Optional[int],
    player1_score: int,
    player2_score: int,
):
    """Mark a battle as complete and update leaderboard."""
    await execute_db_operation(
        """UPDATE battles SET status='complete', winner_id=?, player1_score=?, player2_score=?,
           completed_at=CURRENT_TIMESTAMP WHERE id=?""",
        (winner_id, player1_score, player2_score, battle_id),
    )


async def upsert_leaderboard(
    user_id: int,
    cohort_id: int,
    won: bool,
    score: int,
    streak: int,
):
    """Upsert a leaderboard entry for the current week."""
    week_start = _get_week_start()
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute(
            """INSERT INTO arena_leaderboard (user_id, cohort_id, wins, losses, total_score, win_streak, week_start)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(user_id, cohort_id, week_start) DO UPDATE SET
                 wins = wins + ?,
                 losses = losses + ?,
                 total_score = total_score + ?,
                 win_streak = ?""",
            (
                user_id, cohort_id,
                1 if won else 0, 0 if won else 1, score, streak, week_start,
                # UPDATE part:
                1 if won else 0, 0 if won else 1, score, streak,
            ),
        )
        await conn.commit()


async def get_leaderboard(cohort_id: int) -> List[Dict]:
    """Return the current week's leaderboard for a cohort."""
    week_start = _get_week_start()
    rows = await execute_db_operation(
        """SELECT al.user_id, u.first_name, u.last_name, u.email,
                  al.wins, al.losses, al.total_score, al.win_streak
           FROM arena_leaderboard al
           JOIN users u ON al.user_id = u.id
           WHERE al.cohort_id = ? AND al.week_start = ?
           ORDER BY al.total_score DESC, al.wins DESC
           LIMIT 20""",
        (cohort_id, week_start),
        fetch_all=True,
    )
    return [
        {
            "user_id": r[0],
            "name": f"{r[1] or ''} {r[3] or ''}".strip() or r[3],
            "wins": r[4],
            "losses": r[5],
            "total_score": r[6],
            "win_streak": r[7],
        }
        for r in (rows or [])
    ]


async def get_recent_battles(cohort_id: int, limit: int = 10) -> List[Dict]:
    """Return recent completed battles for a cohort."""
    rows = await execute_db_operation(
        """SELECT b.id, b.player1_id, b.player2_id, b.module_name,
                  b.winner_id, b.player1_score, b.player2_score, b.completed_at,
                  u1.first_name as p1_first, u1.email as p1_email,
                  u2.first_name as p2_first, u2.email as p2_email
           FROM battles b
           JOIN users u1 ON b.player1_id = u1.id
           JOIN users u2 ON b.player2_id = u2.id
           WHERE b.cohort_id = ? AND b.status = 'complete'
           ORDER BY b.completed_at DESC LIMIT ?""",
        (cohort_id, limit),
        fetch_all=True,
    )
    return [
        {
            "id": r[0],
            "player1_id": r[1],
            "player2_id": r[2],
            "module_name": r[3],
            "winner_id": r[4],
            "player1_score": r[5],
            "player2_score": r[6],
            "completed_at": r[7],
            "player1_name": r[8] or r[9],
            "player2_name": r[10] or r[11],
        }
        for r in (rows or [])
    ]
