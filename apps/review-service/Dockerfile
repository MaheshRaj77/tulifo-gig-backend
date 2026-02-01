FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/review-service/package.json ./apps/review-service/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/review-service/ ./apps/review-service/
COPY tsconfig.base.json ./
RUN cd apps/review-service && pnpm build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/review-service/package.json ./apps/review-service/
COPY --from=builder /app/packages ./packages
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
COPY --from=builder /app/apps/review-service/dist ./apps/review-service/dist
WORKDIR /app/apps/review-service
EXPOSE ${PORT}
CMD ["node", "dist/index.js"]
