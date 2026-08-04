# syntax=docker/dockerfile:1.6

# ─── Base stage: shared Node + pnpm cache ────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
# Alpine ships libc-only; Prisma needs OpenSSL to talk to MySQL.
# mysql-client (mariadb-client on Alpine) + gzip are required at runtime
# by /api/cron/backup — it spawns `mysqldump | gzip -c` and streams to
# S3-compatible storage. Both packages are tiny; keeping them in the
# base image avoids a separate runner-only apk install.
RUN apk add --no-cache openssl mariadb-client gzip

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
# Files are chown'd to nextjs so runtime can write to .next/cache (image
# optimizer, ISR revalidation) — otherwise Next.js crashes with EACCES.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts

# Pre-create the writable cache subdirs so the image optimizer doesn't have
# to mkdir them at first request time (which fails silently if the parent
# was already flushed to disk).
RUN mkdir -p .next/cache/images .next/cache/fetch-cache \
  && chown -R nextjs:nodejs .next

USER nextjs
EXPOSE 3000

# On startup:
#   1. Run any pending Prisma migrations (idempotent — tracked in
#      _prisma_migrations table).
#   2. Run first-boot bootstrap (idempotent — seeds default plans and, on
#      the very first boot only, creates an initial super_admin from
#      INITIAL_ADMIN_EMAIL if set).
#   3. Boot the Next.js server.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx scripts/first-boot.ts && npm run start"]
