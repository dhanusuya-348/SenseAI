from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Any
from api.utils.db import execute_db_operation
from api.config import (
    users_table_name,
    task_completions_table_name,
    tasks_table_name,
    course_tasks_table_name,
    milestones_table_name,
)
from datetime import datetime

router = APIRouter(prefix="/growth", tags=["growth"])

@router.get("/{user_id}")
async def get_user_growth(user_id: int):
    # 1. Get user credits
    user = await execute_db_operation(
        f"SELECT credits FROM {users_table_name} WHERE id = ? AND deleted_at IS NULL",
        (user_id,),
        fetch_one=True
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    credits = user[0] if user[0] is not None else 0

    # 2. Get task completion stats by difficulty
    stats_raw = await execute_db_operation(
        f"""
        SELECT t.difficulty, COUNT(tc.id) as completion_count
        FROM {task_completions_table_name} tc
        JOIN {tasks_table_name} t ON tc.task_id = t.id
        WHERE tc.user_id = ? AND tc.deleted_at IS NULL AND t.deleted_at IS NULL
        GROUP BY t.difficulty
        """,
        (user_id,),
        fetch_all=True
    )
    
    difficulty_stats = {"easy": 0, "medium": 0, "hard": 0}
    for diff, count in stats_raw:
        if diff in difficulty_stats:
            difficulty_stats[diff] = count

    # 3. Get unique skills (milestone names) from completed tasks
    skills_raw = await execute_db_operation(
        f"""
        SELECT DISTINCT m.name, m.id
        FROM {task_completions_table_name} tc
        JOIN {course_tasks_table_name} ct ON tc.task_id = ct.task_id
        JOIN {milestones_table_name} m ON ct.milestone_id = m.id
        WHERE tc.user_id = ? AND tc.deleted_at IS NULL AND m.deleted_at IS NULL
        """,
        (user_id,),
        fetch_all=True
    )
    
    skills = [{"name": skill[0], "id": skill[1]} for skill in skills_raw]

    # 4. Get consolidated days of growth (unique active days)
    days_raw = await execute_db_operation(
        f"""
        SELECT COUNT(DISTINCT DATE(created_at))
        FROM {task_completions_table_name}
        WHERE user_id = ? AND deleted_at IS NULL
        """,
        (user_id,),
        fetch_one=True
    )
    
    growth_days = days_raw[0] if days_raw else 0

    return {
        "credits": credits,
        "difficulty_counts": difficulty_stats,
        "skills": skills,
        "growth_days": growth_days
    }
