FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/escrow-service/package.json ./apps/escrow-service/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/escrow-service/ ./apps/escrow-service/
COPY tsconfig.base.json ./
RUN cd apps/escrow-service && pnpm build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/escrow-service/package.json ./apps/escrow-service/
COPY --from=builder /app/packages ./packages
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
COPY --from=builder /app/apps/escrow-service/dist ./apps/escrow-service/dist
WORKDIR /app/apps/escrow-service
EXPOSE ${PORT}
CMD ["node", "dist/index.js"]
