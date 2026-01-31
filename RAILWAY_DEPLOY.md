# Railway Configuration for Tulifo Gig Backend
# Deploy each service as a separate Railway service in a project

# Shared Environment Variables (set in Railway Dashboard > Project Settings > Shared Variables)
# 
# SUPABASE_URL=https://gzolpmpjsdmghgnzlmju.supabase.co
# SUPABASE_ANON_KEY=sb_publishable_yDK3IiBjkkWe-zip73mrLg_-8ZwFqUD
# SUPABASE_SERVICE_KEY=sb_secret_ESKMGXIgltbLtCXiJdGwGg_-S7V1Cnn
# DATABASE_URL=postgresql://postgres.gzolpmpjsdmghgnzlmju:AuDUZfX9mYCOÇjdo@aws-0-us-east-1.pooler.supabase.com:6543/postgres
# MONGODB_URI=mongodb+srv://maheshmsr777_db_user:maheshmsr777_db_user@tulifo.my9vngh.mongodb.net/?appName=tulifo
# JWT_SECRET=CJUl+JvSGEwagzH+xJAdRMACYo+hiqGk23S+101tdOXK9RbjErzjYKAn1I1/oaRpjY3iS3o2xu2F4AleoS7hlA==
# JWT_REFRESH_SECRET=XaqFwZXxX+eQSwAPn6v0EL52J9EYpiQkCmv3caMR3w8l2QtWY7wpssY8BIsc+l2+fejoQgBOQz7sOYf4NuEQRg==
# NODE_ENV=production

# ============================================
# DEPLOYMENT STEPS
# ============================================
# 
# 1. Install Railway CLI:
#    npm install -g @railway/cli
#
# 2. Login to Railway:
#    railway login
#
# 3. Create a new project:
#    railway init
#
# 4. Add shared environment variables in Railway Dashboard
#
# 5. Deploy each service:
#
#    # Auth Service (TypeScript)
#    cd apps/auth-service
#    railway up --service auth-service
#
#    # User Service (TypeScript)
#    cd apps/user-service
#    railway up --service user-service
#
#    # Project Service (TypeScript)
#    cd apps/project-service
#    railway up --service project-service
#
#    # Payment Service (TypeScript)
#    cd apps/payment-service
#    railway up --service payment-service
#
#    # Message Service (TypeScript)
#    cd apps/message-service
#    railway up --service message-service
#
#    # Notification Service (TypeScript)
#    cd apps/notification-service
#    railway up --service notification-service
#
#    # Booking Service (Go)
#    cd apps/booking-service
#    railway up --service booking-service
#
#    # Matching Service (Python)
#    cd apps/matching-service
#    railway up --service matching-service
#
# 6. Add Redis from Railway's plugin marketplace
#
# ============================================
# SERVICE PORTS
# ============================================
# Auth Service:         3001
# User Service:         3002
# Project Service:      3003
# Payment Service:      3004
# Message Service:      3005
# Notification Service: 3006
# Booking Service:      3007
# Matching Service:     3008
