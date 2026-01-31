# Technical Specification: API Gateway

**Service Name**: `api-gateway`
**Repository**: `tulifo-gig-backend/infrastructure/gateway`
**Tech**: Kong (Docker) or Custom Node Proxy
**Port**: 8000 (Public Entry)

## 1. Responsibilities
- Route Routing ( /auth -> Auth Service, /users -> User Service )
- Authentication Verification (Call Auth Service to validate Token)
- Rate Limiting
- CORS Handling

## 2. Routing Rules

| Path Prefix | Target Service | Port |
|-------------|----------------|------|
| `/auth/*`   | auth-service   | 3001 |
| `/users/*`  | user-service   | 3002 |
| `/booking/*`| booking-service| 3003 |

## 3. Configuration (Kong declarative or Nginx)

For MVP (Docker Compose), we can use a simple Nginx reverse proxy `nginx.conf`:

```nginx
server {
    listen 8000;

    location /auth/ {
        proxy_pass http://auth-service:3001/;
    }
    location /users/ {
        proxy_pass http://user-service:3002/;
    }
    location /booking/ {
        proxy_pass http://booking-service:3003/;
    }
}
```
