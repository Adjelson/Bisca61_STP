# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependências (workspaces: shared + server)
COPY package*.json ./
COPY packages/shared/package*.json  ./packages/shared/
COPY packages/server/package*.json  ./packages/server/
RUN npm ci --workspace=packages/shared --workspace=packages/server

# Copiar código fonte
COPY tsconfig.base.json              ./
COPY packages/shared                 ./packages/shared
COPY packages/server                 ./packages/server

# Compilar shared → dist/
RUN npm run build:shared

# Compilar server → dist/
RUN npm run build --workspace=packages/server

# Gerar Prisma Client
RUN npx prisma generate --schema=packages/server/prisma/schema.prisma

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Instalar apenas dependências de produção
COPY package*.json ./
COPY packages/shared/package*.json  ./packages/shared/
COPY packages/server/package*.json  ./packages/server/
RUN npm ci --workspace=packages/shared --workspace=packages/server --omit=dev

# Copiar artefactos compilados
COPY --from=builder /app/packages/server/dist           ./packages/server/dist
COPY --from=builder /app/packages/shared/dist           ./packages/shared/dist
COPY --from=builder /app/node_modules/.prisma           ./node_modules/.prisma
COPY packages/server/prisma                             ./packages/server/prisma

EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
