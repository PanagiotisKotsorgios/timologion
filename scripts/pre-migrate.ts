#!/usr/bin/env tsx
/**
 * Pre-migrate self-healer.
 *
 * Runs BEFORE `prisma migrate deploy` on every container start. Its
 * job is to unstick the Prisma migration table when a previous deploy
 * left a migration in the `finished_at IS NULL` (failed) state.
 *
 * Prisma refuses to apply any further migrations while a prior one is
 * marked failed, and there's no clean CLI way to auto-recover inside a
 * container that boots headless. This script performs the equivalent
 * of `prisma migrate resolve --rolled-back <name>` for a hard-coded
 * list of migration names that we KNOW were only ever additive and
 * safely re-runnable — so if they're stuck in FAILED, we can delete
 * their row and let `migrate deploy` re-run them.
 *
 * We do NOT touch migrations that were APPLIED (finished_at IS NOT
 * NULL). Only failed rows get cleared.
 *
 * Add new entries here ONLY when you're sure re-running the SQL is
 * safe (idempotent or wrapped in IF NOT EXISTS checks).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Migrations we KNOW are additive-only and safe to re-run after a
// rollback. Each entry names a migration whose SQL is either idempotent
// or one-shot ADD COLUMN / CREATE TABLE IF NOT EXISTS.
const SELF_HEAL: readonly string[] = [
  "20260820190000_recurring_auto_transmit",
];

async function main() {
  // The `_prisma_migrations` table is created by Prisma the first time
  // migrate deploy runs. If it doesn't exist yet (very first deploy on
  // a fresh DB) we have nothing to do — deploy will create it.
  const tableExists = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_prisma_migrations'`,
  );
  if (!tableExists.length || Number(tableExists[0]?.c ?? 0) === 0) {
    console.log("[pre-migrate] _prisma_migrations table not present — first deploy, nothing to heal.");
    return;
  }

  for (const name of SELF_HEAL) {
    const rows = await prisma.$queryRawUnsafe<
      { migration_name: string; finished_at: Date | null }[]
    >(
      `SELECT migration_name, finished_at FROM _prisma_migrations
         WHERE migration_name = ?`,
      name,
    );
    if (rows.length === 0) {
      console.log(`[pre-migrate] ${name}: no record, will apply fresh.`);
      continue;
    }
    const row = rows[0]!;
    if (row.finished_at) {
      console.log(`[pre-migrate] ${name}: already applied, skipping heal.`);
      continue;
    }
    // Failed row — delete so migrate deploy can re-run the (fixed) SQL.
    await prisma.$executeRawUnsafe(
      `DELETE FROM _prisma_migrations WHERE migration_name = ?`,
      name,
    );
    console.log(`[pre-migrate] ${name}: cleared failed record, will retry.`);
  }
}

main()
  .catch((err) => {
    console.error("[pre-migrate] non-fatal error:", err);
    // Never block boot on this — worst case the failed migration stays
    // marked failed and `migrate deploy` complains, which is the state
    // we started in.
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
