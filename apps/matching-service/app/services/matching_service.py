from typing import List, Optional, Dict
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import asyncpg
import os

from app.services.database import get_postgres_pool

class MatchingService:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self._skills_vectors = None
        self._workers_cache = {}
    
    async def find_matches(
        self,
        skills: List[str],
        budget_min: float,
        budget_max: float,
        duration: str,
        location: Optional[str] = None,
        timezone: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict]:
        pool = await get_postgres_pool()
        
        # Build query with filters
        query = """
            SELECT 
                wp.user_id,
                wp.title,
                wp.bio,
                wp.skills,
                wp.hourly_rate,
                wp.currency,
                wp.location,
                wp.timezone,
                wp.rating,
                wp.review_count,
                wp.completed_jobs,
                wp.is_available,
                u.first_name,
                u.last_name,
                u.avatar_url
            FROM worker_profiles wp
            JOIN users u ON wp.user_id = u.id
            WHERE wp.is_available = true
              AND u.is_active = true
              AND wp.hourly_rate >= $1
              AND wp.hourly_rate <= $2
        """
        params = [budget_min, budget_max]
        param_idx = 3
        
        if location:
            query += f" AND wp.location ILIKE ${param_idx}"
            params.append(f"%{location}%")
            param_idx += 1
        
        if timezone:
            query += f" AND wp.timezone = ${param_idx}"
            params.append(timezone)
            param_idx += 1
        
        query += " ORDER BY wp.rating DESC, wp.completed_jobs DESC"
        
        async with pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        
        if not rows:
            return []
        
        # Calculate similarity scores
        workers = []
        for row in rows:
            worker_skills = row['skills'] or []
            matched_skills = list(set(skills) & set(worker_skills))
            
            # Calculate skill match score
            skill_score = len(matched_skills) / max(len(skills), 1)
            
            # Calculate text similarity if bio exists
            text_score = 0
            if row['bio']:
                try:
                    skill_text = ' '.join(skills)
                    texts = [skill_text, row['bio']]
                    tfidf_matrix = self.vectorizer.fit_transform(texts)
                    text_score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                except:
                    pass
            
            # Weighted score
            rating_score = (row['rating'] or 0) / 5.0
            experience_score = min((row['completed_jobs'] or 0) / 50, 1.0)
            
            total_score = (
                skill_score * 0.4 +
                text_score * 0.2 +
                rating_score * 0.25 +
                experience_score * 0.15
            )
            
            workers.append({
                'worker_id': row['user_id'],
                'score': round(total_score, 3),
                'matched_skills': matched_skills,
                'hourly_rate': float(row['hourly_rate']),
                'availability': 'available',
                'profile': {
                    'title': row['title'],
                    'first_name': row['first_name'],
                    'last_name': row['last_name'],
                    'avatar_url': row['avatar_url'],
                    'rating': float(row['rating'] or 0),
                    'review_count': row['review_count'] or 0,
                    'completed_jobs': row['completed_jobs'] or 0,
                    'location': row['location'],
                    'timezone': row['timezone']
                }
            })
        
        # Sort by score and return top results
        workers.sort(key=lambda x: x['score'], reverse=True)
        return workers[:limit]
    
    async def get_project_recommendations(self, worker_id: str, limit: int = 10) -> List[Dict]:
        pool = await get_postgres_pool()
        
        async with pool.acquire() as conn:
            # Get worker's skills
            worker = await conn.fetchrow(
                "SELECT skills FROM worker_profiles WHERE user_id = $1",
                worker_id
            )
            
            if not worker or not worker['skills']:
                return []
            
            worker_skills = worker['skills']
            
            # Find matching open projects
            projects = await conn.fetch("""
                SELECT p.*, u.first_name, u.last_name
                FROM projects p
                JOIN users u ON p.client_id = u.id
                WHERE p.status = 'open'
                  AND p.skills && $1::text[]
                ORDER BY p.created_at DESC
            """, worker_skills)
        
        recommendations = []
        for project in projects:
            project_skills = project['skills'] or []
            matched_skills = list(set(worker_skills) & set(project_skills))
            score = len(matched_skills) / max(len(project_skills), 1)
            
            recommendations.append({
                'project_id': project['id'],
                'title': project['title'],
                'description': project['description'][:200] if project['description'] else '',
                'skills': project_skills,
                'matched_skills': matched_skills,
                'budget': project['budget'],
                'score': round(score, 3),
                'client': {
                    'first_name': project['first_name'],
                    'last_name': project['last_name']
                }
            })
        
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:limit]
    
    async def calculate_similarity_score(self, worker_id: str, project_id: str) -> float:
        pool = await get_postgres_pool()
        
        async with pool.acquire() as conn:
            worker = await conn.fetchrow(
                "SELECT skills, bio FROM worker_profiles WHERE user_id = $1",
                worker_id
            )
            project = await conn.fetchrow(
                "SELECT skills, description FROM projects WHERE id = $1",
                project_id
            )
        
        if not worker or not project:
            return 0.0
        
        worker_skills = set(worker['skills'] or [])
        project_skills = set(project['skills'] or [])
        
        if not project_skills:
            return 0.0
        
        skill_overlap = len(worker_skills & project_skills) / len(project_skills)
        
        # Text similarity
        text_score = 0
        if worker['bio'] and project['description']:
            try:
                texts = [worker['bio'], project['description']]
                tfidf_matrix = self.vectorizer.fit_transform(texts)
                text_score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            except:
                pass
        
        return round(skill_overlap * 0.7 + text_score * 0.3, 3)
