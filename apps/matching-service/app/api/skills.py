from fastapi import APIRouter, HTTPException, Query
from typing import List

from app.services.skills_service import SkillsService

router = APIRouter()
skills_service = SkillsService()

@router.get("/search")
async def search_skills(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=10, le=50)
):
    """Search for skills by name."""
    try:
        skills = await skills_service.search_skills(q, limit)
        return {"success": True, "data": skills}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/popular")
async def get_popular_skills(limit: int = Query(default=20, le=100)):
    """Get most popular skills on the platform."""
    try:
        skills = await skills_service.get_popular_skills(limit)
        return {"success": True, "data": skills}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_skill_categories():
    """Get all skill categories."""
    try:
        categories = await skills_service.get_categories()
        return {"success": True, "data": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/related/{skill}")
async def get_related_skills(skill: str, limit: int = Query(default=10, le=30)):
    """Get skills related to a given skill."""
    try:
        related = await skills_service.get_related_skills(skill, limit)
        return {"success": True, "data": related}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
