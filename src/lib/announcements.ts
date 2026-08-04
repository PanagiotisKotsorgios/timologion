import "server-only";
import { prisma } from "@/lib/db";

export type Announcement = {
  id: string;
  tone: "info" | "warning" | "success" | "danger";
  title: string;
  body: string;
  href?: string | null;
  cta?: string | null;
  publishedAt: string; // ISO
};

/**
 * Public feed. Precedence:
 *   - businessId set on the row → only that business
 *   - segment set on the row    → whoever the segment resolves to
 *   - both null                 → global
 * Segment membership is resolved in-app because it depends on the
 * caller's userId; row count is bounded so this stays cheap.
 */
export async function getPublishedAnnouncements(
  businessId?: string | null,
  userId?: string | null,
): Promise<Announcement[]> {
  const now = new Date();
  // Defensive: if a migration hasn't been applied (e.g. `segment` column
  // missing) or the DB is temporarily unavailable, degrade gracefully to
  // an empty feed instead of 500-ing every logged-in page.
  const rows = await prisma.platformAnnouncement
    .findMany({
      where: {
        publishedAt: { lte: now },
        OR: businessId
          ? [
              { businessId: null, segment: null },
              { businessId },
              { businessId: null, segment: { not: null } },
            ]
          : [
              { businessId: null, segment: null },
              { businessId: null, segment: { not: null } },
            ],
      },
      orderBy: { publishedAt: "desc" },
      take: 200,
    })
    .catch(async () => {
      // Fallback query for pre-wave-3 DBs (no segment column). If even
      // this fails, return no announcements at all.
      return prisma.platformAnnouncement
        .findMany({
          where: {
            publishedAt: { lte: now },
            OR: businessId
              ? [{ businessId: null }, { businessId }]
              : [{ businessId: null }],
          },
          orderBy: { publishedAt: "desc" },
          take: 200,
        })
        .catch(() => [] as Awaited<
          ReturnType<typeof prisma.platformAnnouncement.findMany>
        >);
    });

  const segmentsInPlay = new Set(
    rows.map((r) => r.segment).filter((s): s is string => !!s),
  );
  const passes = new Map<string, boolean>();
  for (const seg of segmentsInPlay) {
    passes.set(seg, await callerInSegment(seg, businessId, userId));
  }

  const filtered = rows.filter((r) => {
    if (r.businessId) return true;
    if (r.segment) return passes.get(r.segment) === true;
    return true;
  });

  return filtered.map((r) => ({
    id: r.id,
    tone: r.tone,
    title: r.title,
    body: r.body,
    href: r.ctaHref,
    cta: r.ctaLabel,
    publishedAt: r.publishedAt!.toISOString(),
  }));
}

async function callerInSegment(
  segment: string,
  businessId: string | null | undefined,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  try {
    return await callerInSegmentInner(segment, businessId, userId);
  } catch {
    // Segment check is best-effort — never break the notifications bell
    // just because we couldn't decide if the user is in a segment.
    return false;
  }
}

async function callerInSegmentInner(
  segment: string,
  businessId: string | null | undefined,
  userId: string,
): Promise<boolean> {
  switch (segment) {
    case "admins": {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { platformRole: true, suspendedAt: true },
      });
      return !!u?.platformRole && !u.suspendedAt;
    }
    case "owners":
      return (
        (await prisma.businessMember.count({
          where: { userId, role: "owner" },
        })) > 0
      );
    case "paying_owners":
      return (
        (await prisma.businessMember.count({
          where: {
            userId,
            role: "owner",
            business: {
              subscriptions: {
                some: { status: { in: ["active", "trialing"] } },
              },
            },
          },
        })) > 0
      );
    case "free_users":
      if (!businessId) return false;
      return (
        (await prisma.businessSubscription.count({
          where: {
            businessId,
            status: { in: ["active", "trialing"] },
          },
        })) === 0
      );
    default:
      return false;
  }
}

/**
 * Fetch the user's recent DB-backed notifications (task reminders, low stock,
 * unpaid digest, etc.) and return them in the same shape the bell already
 * consumes. Read-state is per-user (DB) but the bell currently uses
 * localStorage — merging by id keeps both channels visible.
 */
export async function getUserNotifications(
  userId: string,
): Promise<Announcement[]> {
  const rows = await prisma.notification.findMany({
    where: { userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return rows.map((r) => ({
    id: `n:${r.id}`,
    tone: r.tone === "danger" ? "danger" : r.tone,
    title: r.title,
    body: r.body ?? "",
    href: r.href,
    cta: null,
    publishedAt: r.createdAt.toISOString(),
  }));
}

/**
 * Synthetic system-generated notifications (unverified email, activation
 * pending, etc.). These aren't stored in the DB — they're derived from the
 * current user + business state, so they auto-disappear the moment the
 * underlying condition clears (e.g. the user clicks the verification link
 * and `emailVerifiedAt` becomes non-null).
 *
 * Both the bell popover and the full /app/notifications page consume these,
 * so the two views stay in sync automatically.
 */
export async function getSystemNotifications(
  userId: string,
): Promise<Announcement[]> {
  const user = await prisma.user
    .findUnique({
      where: { id: userId },
      select: { email: true, emailVerifiedAt: true },
    })
    .catch(() => null);

  const items: Announcement[] = [];
  if (user && !user.emailVerifiedAt) {
    items.push({
      id: "sys:verify-email",
      tone: "warning",
      title: "Επιβεβαίωση email",
      body: `Το email σου <strong>${user.email}</strong> δεν έχει επιβεβαιωθεί ακόμη. Σου έχουμε στείλει email επιβεβαίωσης — έλεγξε τα εισερχόμενά σου (και τον φάκελο ανεπιθύμητης αλληλογραφίας) και πάτησε τον σύνδεσμο.`,
      href: "/verify-email",
      cta: "Άνοιξε τη σελίδα επιβεβαίωσης",
      publishedAt: new Date().toISOString(),
    });
  }
  return items;
}
