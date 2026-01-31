from typing import List, Dict
import asyncpg
from app.services.database import get_postgres_pool

# Predefined skill categories
SKILL_CATEGORIES = {
    "Development": ["JavaScript", "TypeScript", "Python", "Go", "Rust", "Java", "C++", "Ruby", "PHP", "Swift", "Kotlin"],
    "Frontend": ["React", "Vue", "Angular", "Next.js", "HTML", "CSS", "Tailwind", "Bootstrap", "Svelte"],
    "Backend": ["Node.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot", "NestJS", "GraphQL", "REST API"],
    "Database": ["PostgreSQL", "MongoDB", "MySQL", "Redis", "Elasticsearch", "DynamoDB", "Firebase"],
    "DevOps": ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform", "CI/CD", "Linux", "Nginx"],
    "Mobile": ["React Native", "Flutter", "iOS", "Android", "Swift", "Kotlin"],
    "Design": ["Figma", "UI/UX", "Adobe XD", "Photoshop", "Illustrator", "Sketch"],
    "Data": ["Machine Learning", "Data Science", "TensorFlow", "PyTorch", "Pandas", "SQL", "Data Analysis"],
    "Other": ["Project Management", "Agile", "Scrum", "Technical Writing", "QA Testing"]
}

class SkillsService:
    def __init__(self):
        self._all_skills = []
        for skills in SKILL_CATEGORIES.values():
            self._all_skills.extend(skills)
    
    async def search_skills(self, query: str, limit: int = 10) -> List[str]:
        query_lower = query.lower()
        matches = [
            skill for skill in self._all_skills
            if query_lower in skill.lower()
        ]
        return sorted(matches)[:limit]
    
    async def get_popular_skills(self, limit: int = 20) -> List[Dict]:
        pool = await get_postgres_pool()
        
        async with pool.acquire() as conn:
            # Get skill usage from worker profiles
            result = await conn.fetch("""
                SELECT unnest(skills) as skill, COUNT(*) as count
                FROM worker_profiles
                GROUP BY skill
                ORDER BY count DESC
                LIMIT $1
            """, limit)
        
        return [{"skill": row["skill"], "count": row["count"]} for row in result]
    
    async def get_categories(self) -> Dict[str, List[str]]:
        return SKILL_CATEGORIES
    
    async def get_related_skills(self, skill: str, limit: int = 10) -> List[str]:
        # Find which category the skill belongs to
        skill_category = None
        for category, skills in SKILL_CATEGORIES.items():
            if skill in skills:
                skill_category = category
                break
        
        if not skill_category:
            return []
        
        # Return other skills in the same category
        related = [s for s in SKILL_CATEGORIES[skill_category] if s != skill]
        return related[:limit]
