import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GDPR portability export (Άρθρο 20). Bundles everything we hold about
 * this user into a single JSON payload:
 *   - account fields
 *   - business memberships + the businesses themselves
 *   - documents / clients / items / expenses in each business they own
 *   - sessions (metadata only, not the token hashes)
 *   - audit trail keyed to this user
 *   - password reset history metadata (no token hashes)
 *
 * Response is downloadable JSON. We deliberately do not include
 * cryptographic material (session/reset token hashes) or system-only
 * fields (encrypted secrets) — those are ours, not the user's.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAdmin("super_admin");
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      emailVerifiedAt: true,
      platformRole: true,
      suspendedAt: true,
      suspendedReason: true,
      mfaEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [memberships, sessions, audit, resets] = await Promise.all([
    prisma.businessMember.findMany({
      where: { userId: id },
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
      where: { userId: id },
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
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.passwordReset.findMany({
      where: { userId: id },
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
      adminUserId: ctx.userId,
      adminEmail: ctx.email,
      adminRole: ctx.role,
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
      "This bundle contains every field held about the subject that is not cryptographic material.",
      "Session and password-reset token hashes are excluded — they are one-way and have no meaning without the plaintext.",
      "For business-scoped documents/clients/items, only counts are included at this level; export the individual business from /admin/businesses/:id for full detail.",
    ],
  };

  await logAudit({
    userId: ctx.userId,
    action: "admin.user.gdpr_export",
    entityType: "User",
    entityId: id,
    meta: { email: user.email },
  });

  const filename = `gdpr-export-${user.email.replace(/[^a-z0-9]+/gi, "_")}-${
    new Date().toISOString().slice(0, 10)
  }.json`;

  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
