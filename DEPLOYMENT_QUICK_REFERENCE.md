# 🚀 Deployment Quick Reference - Tulifo Gig Backend

## One-Command Deployment

```bash
# Make scripts executable (if needed)
chmod +x scripts/*.sh

# Deploy everything!
bash scripts/deploy-railway.sh && \
bash scripts/verify-railway.sh && \
bash scripts/prepare-vercel.sh && \
vercel deploy --prod
```

---

## Step-by-Step Deployment

### 1️⃣ Prerequisites (One-Time Setup)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Install jq (JSON processor)
brew install jq  # macOS

# Login to Railway
railway login

# Initialize Railway project
railway init
# Select "tulifo-gig-backend" as project name
```

### 2️⃣ Configure Environment Variables

**Go to:** https://railway.app → Your Project → Settings → Variables

**Add these vars:**
```
SUPABASE_URL=your-value
SUPABASE_ANON_KEY=your-value
SUPABASE_SERVICE_KEY=your-value
DATABASE_URL=your-value
MONGODB_URI=your-value
JWT_SECRET=your-value
JWT_REFRESH_SECRET=your-value
REDIS_URL=your-value
NODE_ENV=production
CORS_ORIGIN=*
```

### 3️⃣ Deploy Services to Railway

```bash
bash scripts/deploy-railway.sh
```

**What happens:**
- ✅ Deploys all 15 microservices
- ✅ Captures service URLs
- ✅ Creates `railway-service-urls.json`
- ✅ Generates `railway-deployment.log`

**Time:** 10-15 minutes

### 4️⃣ Verify Services Are Running

```bash
bash scripts/verify-railway.sh
```

**Expected output:**
```
  auth-service                         ✓ Online (HTTP 200)
  user-service                         ✓ Online (HTTP 200)
  ... all services showing green ✓
```

### 5️⃣ Setup Vercel

```bash
bash scripts/prepare-vercel.sh
```

**What it outputs:**
- Environment variables to add to Vercel
- Step-by-step instructions
- `.env.production` file

### 6️⃣ Add to Vercel Dashboard

**Go to:** https://vercel.com/dashboard

1. Select project `tulifo-gig-backend`
2. Settings → Environment Variables
3. Scope: `Production`
4. Add each variable from the output:
   ```
   AUTH_SERVICE_URL = https://auth-service-*.railway.app
   USER_SERVICE_URL = https://user-service-*.railway.app
   PROJECT_SERVICE_URL = https://project-service-*.railway.app
   ... (all 15)
   ```

### 7️⃣ Deploy to Vercel

```bash
vercel deploy --prod
```

**Done!** 🎉 Your API gateway is live!

---

## Available Endpoints

After deployment, you can access:

```bash
# Health check
curl https://your-vercel-domain.vercel.app/health

# Status dashboard (interactive)
open https://your-vercel-domain.vercel.app/status

# API Gateway
curl https://your-vercel-domain.vercel.app/api/...

# Individual services on Railway
curl https://auth-service-*.railway.app/health
curl https://user-service-*.railway.app/health
```

---

## Troubleshooting

### "Railway CLI not found"
```bash
npm install -g @railway/cli
railway login
```

### "jq not found"
```bash
brew install jq  # macOS
sudo apt-get install jq  # Linux
```

### Services not responding after deploy
```bash
# Wait 3 minutes, then:
bash scripts/verify-railway.sh

# If still failing, check logs:
railway logs -s auth-service
```

### Can't find service URLs
```bash
cat railway-service-urls.json
```

### Vercel deployment failing
- Check all SERVICE_URL variables are set in Vercel
- Verify URLs are accessible: `curl https://auth-service-*.railway.app`
- Check gateway.ts routing logic

---

## Files Created

| File | Purpose |
|------|---------|
| `scripts/deploy-railway.sh` | Deploy all 15 services to Railway |
| `scripts/verify-railway.sh` | Verify all services are healthy |
| `scripts/prepare-vercel.sh` | Setup Vercel environment vars |
| `railway-service-urls.json` | Service URLs (auto-generated) |
| `railway-deployment.log` | Deployment logs (auto-generated) |
| `.env.production` | Production env vars (auto-generated) |

---

## Documentation Files

| File | Purpose |
|------|---------|
| [DEPLOYMENT_AUTOMATION.md](./DEPLOYMENT_AUTOMATION.md) | Complete deployment guide |
| [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) | Railway-specific setup |
| [VERCEL_SETUP.md](./VERCEL_SETUP.md) | Vercel-specific setup |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Architecture details |

---

## Key Commands Reference

```bash
# Railway
railway login                          # Login to Railway
railway init                           # Initialize project
railway up --service SERVICE_NAME      # Deploy service
railway logs -s SERVICE_NAME           # View service logs
railway list                           # List services

# Vercel
vercel deploy --prod                   # Deploy to production
vercel logs --prod                     # View deployment logs
vercel env add KEY_NAME                # Add environment variable

# Scripts
bash scripts/deploy-railway.sh         # Deploy all services
bash scripts/verify-railway.sh         # Check service health
bash scripts/prepare-vercel.sh         # Setup Vercel config
```

---

## Support

- 📖 [DEPLOYMENT_AUTOMATION.md](./DEPLOYMENT_AUTOMATION.md) - Detailed guide
- 🔗 [Railway Docs](https://docs.railway.app)
- 🔗 [Vercel Docs](https://vercel.com/docs)
- 📁 Check individual service READMEs in `apps/*/`

---

## Architecture

```
VERCEL (Gateway)
    ↓ routes to
RAILWAY (15 Microservices)
    ↓ connects to
External: Supabase, MongoDB, Redis, Stripe, etc.
```

**Total Services:** 15 (TypeScript, Go, Python)
**Deployment Time:** 15-20 minutes
**Uptime:** 99.9% SLA with Railway + Vercel

---

**You're all set! Start with:** `bash scripts/deploy-railway.sh`
