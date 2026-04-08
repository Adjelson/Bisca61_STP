# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (workspaces: shared + server)
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
# Copy prisma schema before npm ci so postinstall's `prisma generate` can find it
COPY packages/server/prisma ./packages/server/prisma
RUN npm ci --workspace=packages/shared --workspace=packages/server

# Copy source
COPY tsconfig.base.json             ./
COPY packages/shared                ./packages/shared
COPY packages/server                ./packages/server

# Build shared → dist/
RUN npm run build:shared

# Build server → dist/
RUN npm run build --workspace=packages/server

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copy prisma schema first so postinstall's `prisma generate` finds it
COPY packages/server/prisma ./packages/server/prisma
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
RUN npm ci --workspace=packages/shared --workspace=packages/server --omit=dev

# Copy compiled artefacts + generated Prisma client
COPY --from=builder /app/packages/server/dist  ./packages/server/dist
COPY --from=builder /app/packages/shared/dist  ./packages/shared/dist
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma

EXPOSE 3001

# Sync DB schema on every deploy (creates tables if missing, safe on reruns)
CMD ["sh", "-c", "npx prisma db push --schema=packages/server/prisma/schema.prisma --skip-generate --accept-data-loss && node packages/server/dist/index.js"]
