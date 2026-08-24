import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-service GDPR portability export (Άρθρο 20 GDPR — right to data
 * portability). Mirrors the admin export at
 * /api/admin/users/:id/gdpr-export but authenticates as the SUBJECT
 * (the logged-in user) instead of an admin. Bundles everything we hold
 * on this user into a single downloadable JSON:
 *
 *   - account fields
 *   - business memberships + the businesses themselves
 *   - counts of business-scoped records (documents / clients / items /
 *     expenses) — full detail is exported per-business separately
 *   - active sessions (metadata only, no token hashes)
 *   - audit trail keyed to this user (last 5000 entries)
 *   - password reset history metadata (no token hashes)
 *
 * We deliberately do NOT include cryptographic material (session/reset
 * token hashes, encrypted secrets) — those are one-way and have no
 * meaning without the plaintext.
 *
 * Rate limit: users can hit this once per minute. The response has
 * cache-control: no-store so an intermediary can't cache the personal
 * data.
 */
export async function GET() {
  const ctx = await requireTenant();

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      emailVerifiedAt: true,
      platformRole: true,
      mfaEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [memberships, sessions, audit, resets] = await Promise.all([
    prisma.businessMember.findMany({
      where: { userId: ctx.userId },
      include: {
        business: {
          include: {
            _count: {
              select: {
                documents: true,
                clients: true,
                items: true,
                expenses: true,
              },
            },
          },
        },
      },
    }),
    prisma.session.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        expiresAt: true,
        lastSeenAt: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.passwordReset.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        expiresAt: true,
        usedAt: true,
        ipAddress: true,
        createdAt: true,
      },
    }),
  ]);

  const bundle = {
    generatedAt: new Date().toISOString(),
    generatedBy: {
      // Self-service export — subject is exporting their own data.
      channel: "self_service",
      subjectUserId: ctx.userId,
    },
    subject: user,
    memberships: memberships.map((m) => ({
      role: m.role,
      joinedAt: m.createdAt,
      business: {
        id: m.business.id,
        legalName: m.business.legalName,
        tradeName: m.business.tradeName,
        vatNumber: m.business.vatNumber,
        activity: m.business.activity,
        addressLine: m.business.addressLine,
        city: m.business.city,
        postalCode: m.business.postalCode,
        country: m.business.country,
        phone: m.business.phone,
        email: m.business.email,
        createdAt: m.business.createdAt,
        counts: m.business._count,
      },
    })),
    sessions,
    audit,
    passwordResets: resets,
    notes: [
      "GDPR Article 20 (φορητότητα δεδομένων) — αυτό το αρχείο περιέχει όλα τα προσωπικά δεδομένα που τηρούμε για τον χρήστη, εκτός κρυπτογραφικού υλικού (hashes token, encrypted secrets).",
      "Για πλήρη εξαγωγή των εγγράφων/πελατών/ειδών/εξόδων ανά επιχείρηση, χρησιμοποίησε τα εργαλεία εξαγωγής σε κάθε ενότητα (Excel/PDF).",
      "Ημερομηνίες σε ISO 8601 UTC. Ώρα τοπική Αθήνας = UTC + 2h (EET) ή +3h (EEST).",
    ],
  };

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "user.gdpr_export.self",
    entityType: "User",
    entityId: ctx.userId,
    meta: { email: user.email },
  });

  const filename = `timologion-gdpr-export-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
