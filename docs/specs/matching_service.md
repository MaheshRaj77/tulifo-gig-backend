# Technical Specification: Matching Service

**Service Name**: `matching-service`
**Repository**: `tulifo-gig-backend/apps/matching-service`
**Language**: Python 3.11
**Framework**: FastAPI
**Database**: Elasticsearch (for search), PostgreSQL (read-only replica of Users/Bookings)
**Port**: 3004

## 1. Responsibilities
- Worker Recommendations (AI/ML)
- Search Indexing (Sync with User Service)
- Skill Matching Logic

## 2. Infrastructure (ML/Data)
- **FastAPI**: High performance Python web framework.
- **Elasticsearch**: Stores worker profiles optimized for search.
- **scikit-learn / TensorFlow Lite**: For ranking models.

## 3. API Endpoints

### Public
- `GET /matches/recommend`
  - Query: `projectId` or `skills`
  - Response: List of Worker IDs with scores.

### Private (Internal)
- `POST /index/sync` - Webhook to update Elasticsearch index when User Profile changes.

## 4. Project Structure (Python)

```
app/
  api/
    endpoints/
  core/
    config.py
  ml/
    models/
  services/
    search.py
main.py
requirements.txt
Dockerfile
```
