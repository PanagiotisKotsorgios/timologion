# syntax=docker/dockerfile:1.6

# ─── Base stage: shared Node + pnpm cache ────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
# Alpine ships libc-only; Prisma needs OpenSSL to talk to MySQL.
RUN apk add --no-cache openssl

# ─── Deps stage: install prod + dev deps (needed for build) ─────
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts
RUN npx prisma generate

# ─── Builder stage: Next.js production build ────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma client is regenerated during build to match the current schema.
RUN npx prisma generate
# Next.js emits an optimized standalone bundle so we can ship a small image.
RUN npm run build

# ─── Runner stage: minimal runtime image ────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for the runtime process.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy the built app assets. Prefer standalone output when present.
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts

# On startup:
#   1. Run any pending Prisma migrations (idempotent — tracked in
#      _prisma_migrations table).
#   2. Run first-boot bootstrap (idempotent — seeds default plans and, on
#      the very first boot only, creates an initial super_admin from
#      INITIAL_ADMIN_EMAIL if set).
#   3. Boot the Next.js server.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx scripts/first-boot.ts && npm run start"]

USER nextjs
EXPOSE 3000
