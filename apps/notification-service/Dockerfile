FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root package files for monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/notification-service/package.json ./apps/notification-service/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY apps/notification-service/ ./apps/notification-service/
COPY tsconfig.base.json ./

# Build
RUN cd apps/notification-service && pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/notification-service/package.json ./apps/notification-service/
COPY --from=builder /app/packages ./packages

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy built files
COPY --from=builder /app/apps/notification-service/dist ./apps/notification-service/dist

ENV NODE_ENV=production
ENV PORT=3006

WORKDIR /app/apps/notification-service

EXPOSE 3006

CMD ["node", "dist/index.js"]
