"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { runBackup } from "@/lib/backup";

export async function triggerBackupAction(): Promise<{
  ok: true;
  bytes: number;
  target: string;
} | { ok: false; error: string }> {
  const ctx = await requireAdmin("super_admin");

  const res = await runBackup();

  await logAudit({
    userId: ctx.userId,
    action: "admin.backup.manual_run",
    meta: {
      status: res.ok ? "success" : "failed",
      bytes: String(res.bytes),
      target: res.target,
      error: res.error ?? "",
    },
  });

  revalidatePath("/admin/backups");
  return res.ok
    ? { ok: true, bytes: res.bytes, target: res.target }
    : { ok: false, error: res.error ?? "unknown error" };
}
