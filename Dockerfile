# syntax=docker.io/docker/dockerfile:1

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base

# =========================================
# Install dependencies only when needed
# =========================================
FROM base AS builder

WORKDIR /app

ENV HUSKY=0

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml next.config.ts postcss.config.js tsconfig.json eslint.config.js prettier.config.js vitest.config.ts ./
COPY prisma/ ./prisma

RUN corepack enable pnpm && pnpm install --frozen-lockfile

COPY src/ ./src

RUN NEXT_TELEMETRY_DISABLED=1 SKIP_ENV_VALIDATION=true pnpm build

# =========================================
# Production image, copy all the files and run next
# =========================================
FROM base AS app

RUN apk add --no-cache tini curl

WORKDIR /app

COPY --from=builder --chown=node /app/.next/standalone ./
COPY --from=builder --chown=node /app/.next/static ./.next/static
COPY --from=builder --chown=node /app/prisma ./prisma
COPY --from=builder --chown=node /app/node_modules/@prisma/client/package.json ./node_modules/@prisma/client/package.json

RUN npm install --global --save-exact "prisma@$(node --print 'require("./node_modules/@prisma/client/package.json").version')"

ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://127.0.0.1:3000 || exit 1

ENTRYPOINT ["tini", "--"]

CMD ["sh", "-c", "prisma migrate deploy && node server.js"]