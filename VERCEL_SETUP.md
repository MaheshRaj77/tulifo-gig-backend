# Vercel Deployment - Quick Setup Checklist

## ✅ What's Been Created

- [x] **API Gateway** (`api/gateway.ts`) - Routes all requests to microservices
- [x] **Status Dashboard** (`api/status.ts`) - Real-time service monitoring
- [x] **Home Page** (`api/index.ts`) - Landing page
- [x] **Vercel Config** (`vercel.json`) - Proper routing setup
- [x] **Deployment Guide** (`DEPLOYMENT_GUIDE.md`) - Complete documentation

## 🚀 Deployment Steps

### Step 1: Push to GitHub
```bash
git push origin main
```

### Step 2: Configure Vercel
1. Go to https://vercel.com
2. Connect your GitHub repository
3. Import the project
4. Select "Other" as framework
5. Set Root Directory to `.`

### Step 3: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
# Service URLs (Replace with your actual Render service URLs)
AUTH_SERVICE_URL=https://auth-service.onrender.com
USER_SERVICE_URL=https://user-service.onrender.com
PROJECT_SERVICE_URL=https://project-service.onrender.com
PAYMENT_SERVICE_URL=https://payment-service.onrender.com
MESSAGE_SERVICE_URL=https://message-service.onrender.com
NOTIFICATION_SERVICE_URL=https://notification-service.onrender.com
BOOKING_SERVICE_URL=https://booking-service.onrender.com
MATCHING_SERVICE_URL=https://matching-service.onrender.com
SESSION_SERVICE_URL=https://session-service.onrender.com
WORKER_SERVICE_URL=https://worker-service.onrender.com
ESCROW_SERVICE_URL=https://escrow-service.onrender.com
DISPUTE_SERVICE_URL=https://dispute-service.onrender.com
REVIEW_SERVICE_URL=https://review-service.onrender.com
SEARCH_SERVICE_URL=https://search-service.onrender.com

# Optional Database/Auth Variables
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
REDIS_URL=redis://...
CORS_ORIGIN=*
```

### Step 4: Deploy
- Click "Deploy" in Vercel
- Wait for build to complete
- Visit your Vercel URL

## 🔗 What URLs Will Be Available

After deployment, you'll have:

```
Home Page:       https://your-domain.vercel.app/
Status:          https://your-domain.vercel.app/status
Health Check:    https://your-domain.vercel.app/health
API Gateway:     https://your-domain.vercel.app/api/*
```

## ✨ Features

### Status Dashboard (`/status`)
- **Auto-refresh** every 60 seconds
- **Real-time monitoring** of all 14 services
- **Response times** for each service
- **Error messages** when services are down
- **Success rate** indicator
- **JSON API** for programmatic access

### Home Page (`/`)
- Beautiful landing page
- Service information
- Quick links to status and health check

### Health Endpoint (`/health`)
```bash
curl https://your-domain.vercel.app/health

# Returns:
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2026-02-01T14:39:00.000Z"
}
```

### Status API (`/status`)
```bash
# HTML Dashboard
curl https://your-domain.vercel.app/status

# JSON API
curl https://your-domain.vercel.app/status -H "Accept: application/json"

# Returns:
{
  "timestamp": "2026-02-01T14:39:00.000Z",
  "services": [
    {
      "name": "Auth Service",
      "url": "https://auth-service.onrender.com",
      "status": "healthy",
      "responseTime": 245,
      "lastChecked": "2026-02-01T14:39:00.000Z"
    },
    ...
  ],
  "summary": {
    "total": 14,
    "healthy": 14,
    "unhealthy": 0
  }
}
```

## 🔍 Verification Steps

1. **Check Home Page**
   ```bash
   curl https://your-domain.vercel.app/
   ```

2. **Check Status Dashboard**
   Visit: `https://your-domain.vercel.app/status`

3. **Check Health**
   ```bash
   curl https://your-domain.vercel.app/health
   ```

4. **Check All Services**
   View the status dashboard - shows real-time status of all 14 services

## ⚠️ Troubleshooting

### Services Showing as Unhealthy
1. Check if Render services are running
2. Verify service URLs in env vars match actual Render URLs
3. Ensure services have `/health` endpoint

### 503 Errors
- Service URLs in env vars are incorrect
- Render services are not running
- Check Vercel logs: `vercel logs`

### Slow Response Times
- Check Render service logs
- May indicate database connectivity issues
- Check if services need restart

## 📊 Monitoring

- Visit `/status` regularly to check service health
- Set up alerts for when services go down
- Monitor response times for performance issues
- Check error messages for specific issues

## 🎯 Next Steps

1. Ensure all services are running on Render
2. Test each API endpoint through the gateway
3. Set up proper error logging
4. Configure uptime monitoring (e.g., UptimeRobot)
5. Add API authentication if needed
