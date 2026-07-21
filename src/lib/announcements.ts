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
 * Public feed — only rows with publishedAt <= now, newest first. Used by the
 * tenant NotificationsBell and /app/notifications page.
 */
export async function getPublishedAnnouncements(): Promise<Announcement[]> {
  const now = new Date();
  const rows = await prisma.platformAnnouncement.findMany({
    where: { publishedAt: { lte: now } },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    tone: r.tone,
    title: r.title,
    body: r.body,
    href: r.ctaHref,
    cta: r.ctaLabel,
    publishedAt: r.publishedAt!.toISOString(),
  }));
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
