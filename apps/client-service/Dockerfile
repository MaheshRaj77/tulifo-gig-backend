FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client-service/package.json ./apps/client-service/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile || pnpm install

COPY apps/client-service/ ./apps/client-service/
COPY tsconfig.base.json ./

RUN cd apps/client-service && pnpm build

FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/client-service/package.json ./apps/client-service/
COPY --from=builder /app/packages ./packages

RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

COPY --from=builder /app/apps/client-service/dist ./apps/client-service/dist

ENV NODE_ENV=production
ENV PORT=3011

WORKDIR /app/apps/client-service

EXPOSE 3011

CMD ["node", "dist/index.js"]
