FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root package files for monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/session-service/package.json ./apps/session-service/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY apps/session-service/ ./apps/session-service/
COPY tsconfig.base.json ./

# Build
RUN cd apps/session-service && pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/session-service/package.json ./apps/session-service/
COPY --from=builder /app/packages ./packages

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy built files
COPY --from=builder /app/apps/session-service/dist ./apps/session-service/dist

ENV NODE_ENV=production
ENV PORT=3009

WORKDIR /app/apps/session-service

EXPOSE 3009

CMD ["node", "dist/index.js"]
