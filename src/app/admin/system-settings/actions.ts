"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import {
  APP_SETTING_CATALOG,
  type AppSettingKey,
} from "@/lib/app-settings";

export async function saveSystemSettingsAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const changes: { key: AppSettingKey; value: string }[] = [];

  for (const cfg of APP_SETTING_CATALOG) {
    const raw = formData.get(cfg.key);
    let value: string | null = null;
    if (cfg.type === "boolean") {
      value = raw === "on" ? "true" : "false";
    } else if (raw !== null) {
      value = String(raw).trim();
    }
    if (value === null) continue;
    changes.push({ key: cfg.key, value });
  }

  await prisma.$transaction(
    changes.map((c) =>
      prisma.appSetting.upsert({
        where: { key: c.key },
        create: { key: c.key, value: c.value },
        update: { value: c.value },
      }),
    ),
  );

  await logAudit({
    userId: ctx.userId,
    action: "platform.settings.update",
    meta: { keys: changes.map((c) => c.key) },
  });

  revalidatePath("/admin/system-settings");
}
