# 🚀 Complete Deployment Automation Guide - Tulifo Gig Backend

This guide walks you through **automated deployment** of your entire microservices architecture from zero to production.

## 📋 Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                 VERCEL (API Gateway)                         │
│  - Routes requests to microservices                          │
│  - Status monitoring dashboard                               │
│  - Auto-scales with serverless functions                     │
└────────────────┬─────────────────────────────────────────────┘
                 ↓ HTTP requests to
┌──────────────────────────────────────────────────────────────┐
│              RAILWAY (15 Microservices)                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Auth(3001) │ User(3002) │ Project(3003) │ Payment(...)│  │
│  │ Message(3005) │ Notification(3006) │ Booking(3007)   │  │
│  │ Matching(3008) │ Session(3009) │ Worker(3010)        │  │
│  │ Client(3011) │ Escrow(3012) │ Dispute(3013)          │  │
│  │ Review(3014) │ Search(3015)                           │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────┬─────────────────────────────────────────────┘
                 ↓ connects to
┌──────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Supabase    │  │ MongoDB      │  │ Redis        │        │
│  │ PostgreSQL  │  │ Atlas        │  │ Cloud        │        │
│  └─────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Stripe      │  │ Mailhog      │  │ Elasticsearch│        │
│  │ Payments    │  │ Email Testing│  │ Search       │        │
│  └─────────────┘  └──────────────┘  └──────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

## ⚡ Quick Start (5 Steps)

### Step 1: Install Prerequisites

```bash
# Install Railway CLI
npm install -g @railway/cli

# Install jq (JSON processor)
brew install jq  # macOS
# or
sudo apt-get install jq  # Linux

# Verify installations
railway --version
jq --version
```

### Step 2: Setup Railway Account & Project

```bash
# Login to Railway
railway login

# Navigate to project root
cd /path/to/tulifo-gig-backend

# Initialize Railway project
railway init
# Follow prompts to create "tulifo-gig-backend" project
```

### Step 3: Configure Environment Variables

Go to **https://railway.app** → Your Project → Settings → Variables

Add these shared variables:

```
# Database
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY
DATABASE_URL=YOUR_DATABASE_URL
MONGODB_URI=YOUR_MONGODB_URI

# Secrets
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
REDIS_URL=redis://your-redis-instance

# Configuration
NODE_ENV=production
CORS_ORIGIN=*

# Payment (Optional)
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
```

### Step 4: Run Deployment Scripts

```bash
# Deploy all 15 services to Railway
bash scripts/deploy-railway.sh

# Monitor deployment progress
# Wait 3-5 minutes for Railway to build all services

# Verify all services are running
bash scripts/verify-railway.sh

# Check output - all services should show "✓ Online"
```

### Step 5: Deploy to Vercel

```bash
# Prepare Vercel configuration
bash scripts/prepare-vercel.sh

# This will output environment variables to add to Vercel

# Go to https://vercel.com/dashboard
# → tulifo-gig-backend project
# → Settings → Environment Variables
# → Paste all SERVICE_URL variables from the output above

# Deploy API Gateway to Vercel
vercel deploy --prod

# You're done! 🎉
```

---

## 📊 Detailed Script Usage

### Script 1: `deploy-railway.sh`

Deploys all 15 microservices to Railway.

**What it does:**
- ✅ Checks Railway CLI is installed and authenticated
- ✅ Initializes Railway project if needed
- ✅ Deploys each service (TypeScript, Go, Python)
- ✅ Captures deployment URLs
- ✅ Generates `railway-service-urls.json`
- ✅ Creates `railway-deployment.log`

**Usage:**
```bash
bash scripts/deploy-railway.sh
```

**Output:**
- `railway-service-urls.json` - Contains all service URLs in JSON format
- `railway-deployment.log` - Full deployment logs for troubleshooting

**Time to complete:** 10-15 minutes

---

### Script 2: `verify-railway.sh`

Checks health status of all deployed services.

**What it does:**
- ✅ Reads service URLs from `railway-service-urls.json`
- ✅ Sends health check requests to each service
- ✅ Shows response codes and timeouts
- ✅ Displays formatted table of URLs
- ✅ Provides troubleshooting tips

**Usage:**
```bash
bash scripts/verify-railway.sh
```

**Example output:**
```
  auth-service                         ✓ Online (HTTP 200)
  user-service                         ✓ Online (HTTP 200)
  project-service                      ✓ Online (HTTP 200)
  ...
```

**Run this:**
- After each deployment
- Before deploying to Vercel
- To verify service health periodically

---

### Script 3: `prepare-vercel.sh`

Prepares environment variables for Vercel deployment.

**What it does:**
- ✅ Extracts service URLs from Railway
- ✅ Formats for Vercel environment variables
- ✅ Creates `.env.production` file
- ✅ Shows manual and CLI-based setup options
- ✅ Provides step-by-step deployment instructions

**Usage:**
```bash
bash scripts/prepare-vercel.sh
```

**Output:**
- Formatted environment variables for Vercel
- `.env.production` file for reference
- Step-by-step instructions to complete deployment

---

## 🔧 Individual Service Deployment

If you need to redeploy a single service:

```bash
# Deploy auth service
cd apps/auth-service
railway up --service auth-service
cd ../..

# Or any other service
cd apps/user-service
railway up --service user-service
```

---

## 📱 Access Your Services

### After All Deployments Are Complete

**API Gateway (Vercel):**
```
https://tulifo-gig-backend.vercel.app
```

**Health Check:**
```bash
curl https://tulifo-gig-backend.vercel.app/health
```

**Status Dashboard:**
```
https://tulifo-gig-backend.vercel.app/status
```

**Individual Services (Railway):**
```
Auth Service:      https://auth-service-*.railway.app
User Service:      https://user-service-*.railway.app
Project Service:   https://project-service-*.railway.app
... etc
```

---

## 🔄 Deployment Workflow

### Full Deployment (First Time)
```
railway init
    ↓
Configure environment variables
    ↓
bash scripts/deploy-railway.sh
    ↓
bash scripts/verify-railway.sh
    ↓
bash scripts/prepare-vercel.sh
    ↓
vercel deploy --prod
    ↓
✅ Production Deployed!
```

### Updating a Single Service
```
cd apps/service-name
railway up --service service-name
    ↓
bash scripts/verify-railway.sh
    ↓
✅ Service Updated!
```

### Full Redeployment
```
bash scripts/deploy-railway.sh  # Redeploy all
bash scripts/verify-railway.sh  # Verify
vercel deploy --prod            # Redeploy gateway
```

---

## 🐛 Troubleshooting

### Problem: "Railway CLI not found"
```bash
npm install -g @railway/cli
railway login
```

### Problem: "Not logged in to Railway"
```bash
railway login
```

### Problem: Services not responding after deployment
```bash
# Wait 2-3 minutes and try again
bash scripts/verify-railway.sh

# If still failing, check logs
railway logs -s auth-service
```

### Problem: "jq command not found"
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# After installing, try verify again
bash scripts/verify-railway.sh
```

### Problem: Vercel deployment failing
- Ensure all environment variables are added to Vercel
- Check SERVICE_URL format is correct (https://...)
- Verify gateway.ts can reach the service URLs

### Check Deployment Logs
```bash
# Railway deployment logs
cat railway-deployment.log

# Vercel deployment logs
vercel logs --prod
```

---

## 📚 Service Configuration Files

| Service | Dockerfile | Config | Package |
|---------|-----------|--------|---------|
| auth-service | apps/auth-service/Dockerfile | tsconfig.json | package.json |
| user-service | apps/user-service/Dockerfile | tsconfig.json | package.json |
| ... | ... | ... | ... |

---

## 🎯 Expected Results

After successful deployment:

✅ **Railway Console:**
- All 15 services showing green "Running" status
- Each service has a unique URL
- Environment variables configured

✅ **Vercel Dashboard:**
- API Gateway deployed with green build status
- Environment variables showing all SERVICE_URL entries
- Production deployment active

✅ **Testing:**
```bash
# Test health endpoint
curl https://your-vercel-domain.vercel.app/health

# Test status dashboard
curl https://your-vercel-domain.vercel.app/status

# Test routing to individual service
curl https://your-vercel-domain.vercel.app/api/auth/...
```

---

## 💡 Pro Tips

1. **Monitor Deployments:** Keep Railway and Vercel dashboards open during deployment
2. **Use Logs:** Check logs if services don't respond
3. **Gradual Rollout:** Deploy one service at a time if you encounter issues
4. **Backup URLs:** Keep `railway-service-urls.json` as reference
5. **Environment Security:** Don't commit `.env.production` to git
6. **Monitor Costs:** Check Railway and Vercel usage dashboards regularly

---

## 📖 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Architecture details
- [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) - Railway-specific guide
- [VERCEL_SETUP.md](./VERCEL_SETUP.md) - Vercel-specific guide

---

## ✨ You're All Set!

Your microservices architecture is now fully automated for deployment. The scripts handle:
- ✅ Multi-language service deployment (TypeScript, Go, Python)
- ✅ Automatic URL capture and configuration
- ✅ Health verification
- ✅ Environment variable setup
- ✅ Production-ready deployment

**Questions?** Check the [FAQ](./docs/DOCUMENTATION_INDEX.md) or review specific service README files in each `apps/*/` directory.
