from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel

from app.services.matching_service import MatchingService
from app.services.auth import get_current_user

router = APIRouter()
matching_service = MatchingService()

class MatchRequest(BaseModel):
    skills: List[str]
    budget_min: float
    budget_max: float
    duration: str  # short, medium, long
    location: Optional[str] = None
    timezone: Optional[str] = None

class MatchResult(BaseModel):
    worker_id: str
    score: float
    matched_skills: List[str]
    hourly_rate: float
    availability: str
    profile: dict

@router.post("/find-workers", response_model=List[MatchResult])
async def find_matching_workers(
    request: MatchRequest,
    limit: int = Query(default=20, le=50),
    user: dict = Depends(get_current_user)
):
    """Find workers matching the given criteria using AI-powered matching."""
    try:
        matches = await matching_service.find_matches(
            skills=request.skills,
            budget_min=request.budget_min,
            budget_max=request.budget_max,
            duration=request.duration,
            location=request.location,
            timezone=request.timezone,
            limit=limit
        )
        return matches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations/{worker_id}")
async def get_project_recommendations(
    worker_id: str,
    limit: int = Query(default=10, le=30),
    user: dict = Depends(get_current_user)
):
    """Get project recommendations for a worker."""
    try:
        recommendations = await matching_service.get_project_recommendations(
            worker_id=worker_id,
            limit=limit
        )
        return {"success": True, "data": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/similarity-score")
async def calculate_similarity(
    worker_id: str,
    project_id: str,
    user: dict = Depends(get_current_user)
):
    """Calculate match score between a worker and project."""
    try:
        score = await matching_service.calculate_similarity_score(worker_id, project_id)
        return {"success": True, "data": {"score": score}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
