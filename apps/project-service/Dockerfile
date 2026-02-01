FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root package files for monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/project-service/package.json ./apps/project-service/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY apps/project-service/ ./apps/project-service/
COPY tsconfig.base.json ./

# Build
RUN cd apps/project-service && pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/project-service/package.json ./apps/project-service/
COPY --from=builder /app/packages ./packages

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy built files
COPY --from=builder /app/apps/project-service/dist ./apps/project-service/dist

ENV NODE_ENV=production
ENV PORT=3003

WORKDIR /app/apps/project-service

EXPOSE 3003

CMD ["node", "dist/index.js"]
