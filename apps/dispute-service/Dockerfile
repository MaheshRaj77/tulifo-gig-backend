FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dispute-service/package.json ./apps/dispute-service/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/dispute-service/ ./apps/dispute-service/
COPY tsconfig.base.json ./
RUN cd apps/dispute-service && pnpm build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/dispute-service/package.json ./apps/dispute-service/
COPY --from=builder /app/packages ./packages
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
COPY --from=builder /app/apps/dispute-service/dist ./apps/dispute-service/dist
WORKDIR /app/apps/dispute-service
EXPOSE ${PORT}
CMD ["node", "dist/index.js"]
