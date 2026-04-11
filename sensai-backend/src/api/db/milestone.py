from typing import Dict, Tuple, List, Optional
from api.utils.db import execute_db_operation, execute_multiple_db_operations
from api.config import (
    milestones_table_name,
    course_tasks_table_name,
    course_milestones_table_name,
    chat_history_table_name,
    tasks_table_name,
    uncategorized_milestone_name,
    uncategorized_milestone_color,
)


def convert_milestone_db_to_dict(milestone: Tuple) -> Dict:
    return {
        "id": milestone[0], 
        "name": milestone[1], 
        "color": milestone[2],
        "difficulty": milestone[3] if len(milestone) > 3 else "easy",
        "unlock_cost": milestone[4] if len(milestone) > 4 else 0,
        "is_free": bool(milestone[5]) if len(milestone) > 5 else False
    }


async def get_milestone(milestone_id: int) -> Dict:
    milestone = await execute_db_operation(
        f"SELECT id, name, color, difficulty, unlock_cost, is_free FROM {milestones_table_name} WHERE id = ? AND deleted_at IS NULL",
        (milestone_id,),
        fetch_one=True,
    )

    if not milestone:
        return None

    return convert_milestone_db_to_dict(milestone)


async def get_all_milestones():
    milestones = await execute_db_operation(
        f"SELECT id, name, color, difficulty, unlock_cost, is_free FROM {milestones_table_name} WHERE deleted_at IS NULL",
        fetch_all=True,
    )

    return [convert_milestone_db_to_dict(milestone) for milestone in milestones]


async def get_all_milestones_for_org(org_id: int):
    milestones = await execute_db_operation(
        f"SELECT id, name, color, difficulty, unlock_cost, is_free FROM {milestones_table_name} WHERE org_id = ? AND deleted_at IS NULL",
        (org_id,),
        fetch_all=True,
    )

    return [convert_milestone_db_to_dict(milestone) for milestone in milestones]


async def update_milestone(
    milestone_id: int,
    name: str | None = None,
    color: str | None = None,
    difficulty: str | None = None,
    unlock_cost: int | None = None,
    is_free: bool | None = None,
    is_locked: bool | None = None,
):
    updates = []
    params = []
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if color is not None:
        updates.append("color = ?")
        params.append(color)
    if difficulty is not None:
        updates.append("difficulty = ?")
        params.append(difficulty)
    if unlock_cost is not None:
        updates.append("unlock_cost = ?")
        params.append(unlock_cost)
    if is_free is not None:
        updates.append("is_free = ?")
        params.append(1 if is_free else 0)
    if is_locked is not None:
        updates.append("is_locked = ?")
        params.append(1 if is_locked else 0)

    if not updates:
        return

    params.append(milestone_id)
    query = f"UPDATE {milestones_table_name} SET {', '.join(updates)} WHERE id = ? AND deleted_at IS NULL"

    # If difficulty is changing, update all tasks in this milestone
    operations = [(query, tuple(params))]
    if difficulty is not None:
        operations.append(
            (
                f"""
                UPDATE {tasks_table_name} 
                SET difficulty = ? 
                WHERE id IN (
                    SELECT task_id FROM {course_tasks_table_name} 
                    WHERE milestone_id = ? AND deleted_at IS NULL
                )
                """,
                (difficulty, milestone_id),
            )
        )

    await execute_multiple_db_operations(operations)


async def delete_milestone(milestone_id: int):
    await execute_multiple_db_operations(
        [
            (
                f"UPDATE {milestones_table_name} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
                (milestone_id,),
            ),
            (
                f"UPDATE {course_tasks_table_name} SET milestone_id = NULL WHERE milestone_id = ?",
                (milestone_id,),
            ),
            (
                f"UPDATE {course_milestones_table_name} SET deleted_at = CURRENT_TIMESTAMP WHERE milestone_id = ? AND deleted_at IS NULL",
                (milestone_id,),
            ),
        ]
    )


async def get_user_metrics_for_all_milestones(user_id: int, course_id: int):
    # Get milestones with tasks
    results = await execute_db_operation(
        f"""
        SELECT 
            m.id AS milestone_id,
            m.name AS milestone_name,
            m.color AS milestone_color,
            COUNT(DISTINCT t.id) AS total_tasks,
            (
                SELECT COUNT(DISTINCT ch.task_id)
                FROM {chat_history_table_name} ch
                WHERE ch.user_id = ? AND ch.deleted_at IS NULL
                AND ch.is_solved = 1
                AND ch.task_id IN (
                    SELECT t2.id 
                    FROM {tasks_table_name} t2 
                    JOIN {course_tasks_table_name} ct2 ON t2.id = ct2.task_id
                    WHERE ct2.milestone_id = m.id 
                    AND ct2.course_id = ?
                    AND t2.deleted_at IS NULL
                    AND ct2.deleted_at IS NULL
                )
            ) AS completed_tasks
        FROM 
            {milestones_table_name} m
        LEFT JOIN 
            {course_tasks_table_name} ct ON m.id = ct.milestone_id
        LEFT JOIN
            {tasks_table_name} t ON ct.task_id = t.id
        LEFT JOIN
            {course_milestones_table_name} cm ON m.id = cm.milestone_id AND ct.course_id = cm.course_id
        WHERE 
            t.verified = 1 AND ct.course_id = ? AND t.deleted_at IS NULL AND ct.deleted_at IS NULL AND cm.deleted_at IS NULL AND m.deleted_at IS NULL
        GROUP BY 
            m.id, m.name, m.color
        HAVING 
            COUNT(DISTINCT t.id) > 0
        ORDER BY 
            cm.ordering
        """,
        params=(user_id, course_id, course_id),
        fetch_all=True,
    )

    return [
        {
            "milestone_id": row[0],
            "milestone_name": row[1],
            "milestone_color": row[2],
            "total_tasks": row[3],
            "completed_tasks": row[4],
        }
        for row in results
    ]


async def unlock_milestone(user_id: int, milestone_id: int):
    from api.db.user import get_user_by_id
    from api.config import users_table_name
    from api.utils.db import get_new_db_connection

    # 1. Fetch milestone unlock cost
    milestone = await get_milestone(milestone_id)
    if not milestone:
        raise ValueError("Milestone not found")

    cost = milestone.get("unlock_cost", 0)
    if cost <= 0:
        return {"message": "Milestone is already free"}

    # 2. Get user credits
    user = await get_user_by_id(user_id)
    if not user:
        raise ValueError("User not found")

    current_credits = user.get("credits", 0)
    if current_credits < cost:
        raise ValueError("Insufficient credits")

    # 3. Check if already unlocked
    already_unlocked = await execute_db_operation(
        "SELECT 1 FROM user_unlocked_milestones WHERE user_id = ? AND milestone_id = ?",
        (user_id, milestone_id),
        fetch_one=True
    )
    if already_unlocked:
        return {"message": "Milestone already unlocked"}

    # 4. Deduct credits and record unlock in a transaction
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        try:
            # Deduct credits
            await cursor.execute(
                f"UPDATE {users_table_name} SET credits = credits - ? WHERE id = ?",
                (cost, user_id)
            )

            # Record unlock
            await cursor.execute(
                "INSERT INTO user_unlocked_milestones (user_id, milestone_id) VALUES (?, ?)",
                (user_id, milestone_id)
            )

            await conn.commit()
        except Exception as e:
            await conn.rollback()
            raise e

    return {
        "message": "Milestone unlocked successfully",
        "credits_remaining": current_credits - cost
    }
