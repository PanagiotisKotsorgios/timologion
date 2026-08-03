"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

export async function bulkBusinessAction(
  formData: FormData,
): Promise<
  | { ok: true; affected: number; skipped: number }
  | { ok: false; error: string }
> {
  const ctx = await requireAdmin("super_admin", "support");
  const action = String(formData.get("action") ?? "");
  const idsRaw = String(formData.get("ids") ?? "");
  const extra = String(formData.get("extra") ?? "");
  const ids = idsRaw.split(",").filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "Καμία επιλογή." };
  if (ids.length > 500)
    return { ok: false, error: "Πάνω από 500 σε ένα batch." };

  let affected = 0;
  let skipped = 0;

  switch (action) {
    case "suspend": {
      const now = new Date();
      const reason = extra.slice(0, 255) || "Bulk suspension";
      const res = await prisma.business.updateMany({
        where: { id: { in: ids }, suspendedAt: null },
        data: { suspendedAt: now, suspendedReason: reason },
      });
      affected = res.count;
      skipped = ids.length - affected;
      break;
    }
    case "unsuspend": {
      const res = await prisma.business.updateMany({
        where: { id: { in: ids }, suspendedAt: { not: null } },
        data: { suspendedAt: null, suspendedReason: null },
      });
      affected = res.count;
      skipped = ids.length - affected;
      break;
    }
    case "tag": {
      // Merge-add: fetch each existing row, dedupe tags, write back.
      const tagsToAdd = extra
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tagsToAdd.length === 0) return { ok: false, error: "Κενά tags." };

      const businesses = await prisma.business.findMany({
        where: { id: { in: ids } },
        select: { id: true, supportTags: true },
      });

      for (const b of businesses) {
        const existing = (b.supportTags ?? "")
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        const merged = Array.from(new Set([...existing, ...tagsToAdd])).join(",");
        if (merged === (b.supportTags ?? "")) {
          skipped += 1;
          continue;
        }
        await prisma.business.update({
          where: { id: b.id },
          data: { supportTags: merged },
        });
        affected += 1;
      }
      break;
    }
    default:
      return { ok: false, error: `Άγνωστο action: ${action}` };
  }

  await logAudit({
    userId: ctx.userId,
    action: `admin.business.bulk_${action}`,
    entityType: "Business",
    meta: { count: ids.length, affected, skipped, extra: extra.slice(0, 200) },
  });

  revalidatePath("/admin/businesses");
  return { ok: true, affected, skipped };
}
