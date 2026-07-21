"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  id: z.string().optional().or(z.literal("")),
  tone: z.enum(["info", "warning", "success"]).default("info"),
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(20000),
  ctaHref: z.string().max(300).optional().or(z.literal("")),
  ctaLabel: z.string().max(80).optional().or(z.literal("")),
  publish: z.string().optional(),
});

export type AnnState = { error?: string; success?: string } | undefined;
const o = (v?: string) => (v && v.length > 0 ? v : null);

export async function saveAnnouncementAction(
  _prev: AnnState,
  formData: FormData,
): Promise<AnnState> {
  const ctx = await requireAdmin("super_admin", "support");
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const shouldPublish = parsed.data.publish === "on";
  const data = {
    tone: parsed.data.tone,
    title: parsed.data.title,
    body: parsed.data.body,
    ctaHref: o(parsed.data.ctaHref),
    ctaLabel: o(parsed.data.ctaLabel),
  };

  let id = parsed.data.id;
  if (id) {
    const existing = await prisma.platformAnnouncement.findUnique({
      where: { id },
      select: { publishedAt: true },
    });
    await prisma.platformAnnouncement.update({
      where: { id },
      data: {
        ...data,
        publishedAt: shouldPublish
          ? (existing?.publishedAt ?? new Date())
          : null,
      },
    });
    await logAudit({
      userId: ctx.userId,
      action: "platform.announcement.update",
      entityType: "PlatformAnnouncement",
      entityId: id,
      meta: { published: shouldPublish },
    });
  } else {
    const created = await prisma.platformAnnouncement.create({
      data: {
        ...data,
        authorId: ctx.userId,
        publishedAt: shouldPublish ? new Date() : null,
      },
    });
    id = created.id;
    await logAudit({
      userId: ctx.userId,
      action: "platform.announcement.create",
      entityType: "PlatformAnnouncement",
      entityId: id,
      meta: { published: shouldPublish },
    });
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/app/notifications", "layout");
  redirect("/admin/announcements");
}

export async function deleteAnnouncementAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.platformAnnouncement.delete({ where: { id } });
  await logAudit({
    userId: ctx.userId,
    action: "platform.announcement.delete",
    entityType: "PlatformAnnouncement",
    entityId: id,
  });
  revalidatePath("/admin/announcements");
  revalidatePath("/app/notifications", "layout");
}

export async function togglePublishAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin", "support");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const cur = await prisma.platformAnnouncement.findUnique({
    where: { id },
    select: { publishedAt: true },
  });
  if (!cur) return;
  await prisma.platformAnnouncement.update({
    where: { id },
    data: { publishedAt: cur.publishedAt ? null : new Date() },
  });
  await logAudit({
    userId: ctx.userId,
    action: "platform.announcement.toggle_publish",
    entityType: "PlatformAnnouncement",
    entityId: id,
    meta: { published: !cur.publishedAt },
  });
  revalidatePath("/admin/announcements");
  revalidatePath("/app/notifications", "layout");
}
