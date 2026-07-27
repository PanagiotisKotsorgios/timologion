"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { activatePluginForBusiness, type PluginCode } from "@/lib/plugins";

/**
 * Turns on a plugin's 6-month trial. Idempotent — activating an already
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

  revalidatePath("/app/plugins");
  revalidatePath("/app");
  redirect(res.activation ? `/app/plugins?activated=${code}` : "/app/plugins");
}
