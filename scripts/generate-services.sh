#!/bin/bash

# Script to generate all remaining backend services
# This creates package.json, tsconfig.json, Dockerfile, and basic structure for each service

SERVICES=("escrow-service:3012" "dispute-service:3013" "review-service:3014" "search-service:3015")

for service_info in "${SERVICES[@]}"; do
  IFS=':' read -r service port <<< "$service_info"
  
  echo "Creating $service on port $port..."
  
  # Create package.json
  cat > "apps/$service/package.json" << EOF
{
  "name": "@tulifo/$service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongodb": "^6.3.0",
    "pg": "^8.11.3",
    "pino": "^8.17.2",
    "pino-pretty": "^10.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.11.0",
    "@types/pg": "^8.10.9",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
EOF

  # Create tsconfig.json
  cat > "apps/$service/tsconfig.json" << EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

  # Create Dockerfile
  cat > "apps/$service/Dockerfile" << EOF
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/$service/package.json ./apps/$service/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile || pnpm install

COPY apps/$service/ ./apps/$service/
COPY tsconfig.base.json ./

RUN cd apps/$service && pnpm build

FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/$service/package.json ./apps/$service/
COPY --from=builder /app/packages ./packages

RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

COPY --from=builder /app/apps/$service/dist ./apps/$service/dist

ENV NODE_ENV=production
ENV PORT=$port

WORKDIR /app/apps/$service

EXPOSE $port

CMD ["node", "dist/index.js"]
EOF

  echo "$service created successfully!"
done

echo "All services created!"
