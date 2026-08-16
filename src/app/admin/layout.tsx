import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import {
  ipAllowedForAdmin,
  adminRequires2FA,
} from "@/lib/admin-security";
import { clientIp } from "@/lib/rate-limit";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { StagingBanner } from "@/components/StagingBanner";

export const metadata: Metadata = {
  title: {
    default: "Admin | Τιμολόγιον",
    template: "%s | Admin · Τιμολόγιον",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const ctx = await requireAdmin();

  // IP allowlist — if configured, non-matching requests get bounced to
  // /app with an audit trail entry so we can see attempted access.
  const hdrs = await headers();
  const ip = clientIp(hdrs);
  if (!ipAllowedForAdmin(ip)) {
    logger.warn("admin.ip_blocked", {
      userId: ctx.userId,
      ip,
      path: hdrs.get("x-invoke-path") ?? "",
    });
    redirect("/app?admin_blocked=1");
  }

  // 2FA enforcement — admins without MFA setup are sent to enable it.
  if (adminRequires2FA()) {
    const me = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { mfaEnabled: true },
    });
    if (!me?.mfaEnabled) {
      redirect("/app/settings/security?admin_2fa_required=1");
    }
  }

  const envLabel = env.ENVIRONMENT_LABEL?.trim();

  return (
    <>
      <StagingBanner />
      <div className="flex min-h-screen bg-ink-100">
        {envLabel && <EnvBanner label={envLabel} />}
        <AdminSidebar />
        <div className={`flex min-w-0 flex-1 flex-col ${envLabel ? "pt-8" : ""}`}>
          <AdminTopbar userName={ctx.fullName || ctx.email} role={ctx.role} />
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 md:px-6 md:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/**
 * Fixed strip along the top of the admin panel that makes the current
 * environment impossible to miss. Never rendered when ENVIRONMENT_LABEL
 * is empty — production uses no marker so admins immediately notice
 * one appearing after a wrong-env deploy.
 */
function EnvBanner({ label }: { label: string }) {
  // Color by label content — "prod" or "production" gets red (danger you
  // might be about to touch real data), everything else gets amber.
  const isProdish = /prod/i.test(label);
  const cls = isProdish
    ? "bg-red-700 text-white"
    : "bg-amber-500 text-black";
  return (
    <div
      className={`fixed inset-x-0 top-0 z-[100] flex h-8 items-center justify-center gap-2 text-xs font-black uppercase tracking-widest shadow ${cls}`}
      style={{ letterSpacing: "0.35em" }}
      aria-label={`Environment: ${label}`}
    >
      <span
        aria-hidden
        className="grid h-4 w-4 place-items-center rounded-full bg-white/25 text-[10px]"
      >
        !
      </span>
      {label}
      <span
        aria-hidden
        className="grid h-4 w-4 place-items-center rounded-full bg-white/25 text-[10px]"
      >
        !
      </span>
    </div>
  );
}
