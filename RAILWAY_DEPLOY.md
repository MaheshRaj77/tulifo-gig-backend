# Railway Deployment Guide - Tulifo Gig Backend

This guide provides automated deployment scripts for deploying all 15 microservices to Railway, then configuring Vercel as the API gateway.

## 🚀 Quick Start (Automated)

### Prerequisites
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Install jq (for JSON parsing)
# macOS:
brew install jq
# Ubuntu/Debian:
sudo apt-get install jq

# 3. Login to Railway
railway login

# 4. Create a Railway project
cd /path/to/tulifo-gig-backend
railway init
```

### Deploy All Services Automatically

```bash
# Step 1: Deploy all 15 services to Railway
bash scripts/deploy-railway.sh

# Step 2: Verify all services are running and healthy
bash scripts/verify-railway.sh

# Step 3: Prepare Vercel environment variables
bash scripts/prepare-vercel.sh

# Step 4: Deploy API Gateway to Vercel
vercel deploy --prod
```

## 📖 What Each Script Does

### 1. `deploy-railway.sh` - Deploy All Services
- ✅ Checks prerequisites (Railway CLI, authentication)
- ✅ Initializes Railway project if needed
- ✅ Deploys all 15 services to Railway
- ✅ Captures service URLs
- ✅ Generates `railway-service-urls.json`

**Output:** 
- `railway-service-urls.json` - Contains all deployed service URLs
- `railway-deployment.log` - Detailed deployment logs

### 2. `verify-railway.sh` - Verify Services
- ✅ Checks health status of all services
- ✅ Displays response times
- ✅ Shows any errors or timeouts
- ✅ Confirms URLs are accessible

**Usage:**
```bash
bash scripts/verify-railway.sh
```

### 3. `prepare-vercel.sh` - Setup Vercel Config
- ✅ Extracts service URLs from Railway
- ✅ Formats environment variables for Vercel
- ✅ Creates `.env.production` file
- ✅ Shows step-by-step deployment instructions

**Usage:**
```bash
bash scripts/prepare-vercel.sh
```

---

## 🔧 Environment Variables Setup

### Railway Dashboard Configuration

Set these shared variables in Railway Dashboard > Project Settings > Shared Variables:

**Database & Secrets:**
```
SUPABASE_URL=https://gzolpmpjsdmghgnzlmju.supabase.co
SUPABASE_ANON_KEY=sb_publishable_yDK3IiBjkkWe-zip73mrLg_-8ZwFqUD
SUPABASE_SERVICE_KEY=sb_secret_ESKMGXIgltbLtCXiJdGwGg_-S7V1Cnn
DATABASE_URL=postgresql://postgres.gzolpmpjsdmghgnzlmju:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=tulifo
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
REDIS_URL=redis://your-redis-url
NODE_ENV=production
CORS_ORIGIN=*
```

**Stripe (if using payment service):**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**SMTP (if using notification service):**
```
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
EMAIL_FROM=noreply@tulifo.com
```

---

## 📊 Service Information

### All 15 Services
| Service | Language | Port | Status |
|---------|----------|------|--------|
| Auth Service | TypeScript | 3001 | ✓ |
| User Service | TypeScript | 3002 | ✓ |
| Project Service | TypeScript | 3003 | ✓ |
| Payment Service | TypeScript | 3004 | ✓ |
| Message Service | TypeScript | 3005 | ✓ |
| Notification Service | TypeScript | 3006 | ✓ |
| Booking Service | Go | 3007 | ✓ |
| Matching Service | Python | 3008 | ✓ |
| Session Service | TypeScript | 3009 | ✓ |
| Worker Service | TypeScript | 3010 | ✓ |
| Client Service | TypeScript | 3011 | ✓ |
| Escrow Service | TypeScript | 3012 | ✓ |
| Dispute Service | TypeScript | 3013 | ✓ |
| Review Service | TypeScript | 3014 | ✓ |
| Search Service | TypeScript | 3015 | ✓ |

---

## ⚙️ Manual Deployment (If Needed)

If you prefer to deploy services individually:

```bash
# Get into each service directory and deploy
cd apps/auth-service && railway up --service auth-service
cd apps/user-service && railway up --service user-service
cd apps/project-service && railway up --service project-service
# ... repeat for each service
```

---

## 🔗 After Deployment

### 1. Verify Services in Railway Dashboard
- Go to https://railway.app
- Select your project
- Check all services are running (green status)
- Get service URLs from each service's "Deployments" tab

### 2. Collect Service URLs
Service URLs follow the pattern:
```
https://service-name-up.railway.app
```

### 3. Add to Vercel Environment Variables
- Go to https://vercel.com/dashboard
- Select project
- Settings > Environment Variables
- Add each service URL:
  - `AUTH_SERVICE_URL=https://auth-service-*.railway.app`
  - `USER_SERVICE_URL=https://user-service-*.railway.app`
  - etc.

### 4. Deploy Vercel Gateway
```bash
vercel deploy --prod
```

---

## 🐛 Troubleshooting

### Services Not Responding
1. Wait 2-3 minutes for Railway to finish building
2. Check Railway dashboard for build errors
3. View service logs:
   ```bash
   railway logs -s auth-service
   ```

### Build Failures
- Check Dockerfile exists in each service directory
- Verify environment variables are set in Railway dashboard
- Check build logs in Railway dashboard

### URL Collection Failed
- Manually get URLs from Railway dashboard
- Each service's deployment tab shows the URL
- Manually add to `railway-service-urls.json`

### Vercel Deployment Issues
- Ensure all environment variables are added to Vercel
- Check gateway.ts is correctly routing to services
- Verify CORS_ORIGIN includes frontend URL

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Project Architecture](./DEPLOYMENT_GUIDE.md)
