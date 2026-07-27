"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { activatePluginForBusiness, type PluginCode } from "@/lib/plugins";

/**
 * Turns on a plugin's 12-month trial. Idempotent — activating an already
 * active plugin just redirects the user to its landing route.
 */
export async function activatePluginAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");
  const code = String(formData.get("code") ?? "") as PluginCode;
  if (!code) return;

  const res = await activatePluginForBusiness(ctx.businessId, code);
  if (!res.ok) return;

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "plugin.activate",
    entityType: "PluginActivation",
    entityId: res.activation.id,
    meta: { code },
  });

  // Layout-level invalidation — the sidebar (rendered in /app/layout.tsx)
  // reads the plugin runtime, so a plain revalidatePath("/app") only busts
  // the dashboard page and leaves the sidebar showing stale data. The
  // "layout" second arg re-runs the layout tree and every page under it.
  revalidatePath("/app", "layout");
  redirect(res.activation ? `/app/plugins?activated=${code}` : "/app/plugins");
}

/**
 * Turns a plugin off — flips the status to "cancelled". Kept as a row
 * (not deleted) so audit/history stays intact and re-activation later
 * knows about the previous trial dates.
 */
export async function deactivatePluginAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");
  const code = String(formData.get("code") ?? "") as PluginCode;
  if (!code) return;

  const activation = await prisma.pluginActivation.findUnique({
    where: { businessId_pluginCode: { businessId: ctx.businessId, pluginCode: code } },
  });
  if (!activation) return;

  await prisma.pluginActivation.update({
    where: { id: activation.id },
    data: { status: "cancelled" },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "plugin.deactivate",
    entityType: "PluginActivation",
    entityId: activation.id,
    meta: { code },
  });

  // Layout-level invalidation — the sidebar (rendered in /app/layout.tsx)
  // reads the plugin runtime, so a plain revalidatePath("/app") only busts
  // the dashboard page and leaves the sidebar showing stale data. The
  // "layout" second arg re-runs the layout tree and every page under it.
  revalidatePath("/app", "layout");
  redirect(`/app/plugins?deactivated=${code}`);
}
