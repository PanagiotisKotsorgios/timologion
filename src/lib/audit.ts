import { prisma } from "@/lib/db";

export type AuditEntry = {
  businessId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: unknown;
  ipAddress?: string;
};

export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        businessId: entry.businessId ?? null,
        userId: entry.userId ?? null,
        action: entry.action.slice(0, 80),
        entityType: entry.entityType?.slice(0, 60),
        entityId: entry.entityId?.slice(0, 60),
        meta: entry.meta ? JSON.stringify(entry.meta).slice(0, 8000) : null,
        ipAddress: entry.ipAddress?.slice(0, 60),
      },
    });
  } catch (err) {
    // Never let audit failures block business flow, but surface for monitoring.
    // Avoid importing logger here to keep audit dependency-light; a raw stderr
    // line is picked up by any log aggregator.
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "audit.write_failed",
        action: entry.action,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
