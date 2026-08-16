import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { Sidebar, type SidebarPlugin } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getPluginRuntime } from "@/lib/plugins";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { StagingBanner } from "@/components/StagingBanner";
import { ToastProvider } from "@/components/ui/Toast";
import { ActivationGate } from "./ActivationGate";

export const metadata: Metadata = {
  title: {
    default: "Dashboard | Τιμολόγιον",
    template: "%s | Τιμολόγιον",
  },
  robots: { index: false, follow: false, nocache: true },
};

// Layout reads plugin activations to build the sidebar — force dynamic so
// activation / deactivation is reflected on the very next render instead of
// waiting for a full route rebuild.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        fullName: true,
        email: true,
        sessionTimeoutMinutes: true,
      },
    }),
    prisma.businessMember.findMany({
      where: { userId: session.userId },
      include: {
        business: { select: { id: true, legalName: true, tradeName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user) redirect("/login");

  // Zero-business users must onboard first. The onboarding page renders on its
  // own without the sidebar, so short-circuit before the shell.
  if (memberships.length === 0) {
    return <>{children}</>;
  }

  const active =
    memberships.find((m) => m.businessId === session.activeBusinessId) ??
    memberships[0]!;

  // Wrapp activation status + business phone for the active business — drive
  // the blocking gate. The phone is passed through so the gate can prompt for
  // it inline when Wrapp's external_login would otherwise reject the request.
  const [wrapp, activeBusiness] = await Promise.all([
    prisma.wrappConnection.findUnique({
      where: { businessId: active.businessId },
      select: { status: true },
    }),
    prisma.business.findUnique({
      where: { id: active.businessId },
      select: { phone: true },
    }),
  ]);

  const needsActivation = (wrapp?.status ?? "inactive") !== "active";
  const hasPhone = Boolean(activeBusiness?.phone?.trim());

  // Load the plugin activation state for the active business so the
  // sidebar only shows rows for plugins the tenant has turned on. Runs
  // once per page render — cached-friendly since we're already on a
  // dynamic layout that hits the DB for the wrapp status.
  const pluginRuntime = await getPluginRuntime(active.businessId);
  const sidebarPlugins: SidebarPlugin[] = Array.from(
    pluginRuntime.values(),
  )
    .filter((p) => p.status === "trialing" || p.status === "active")
    .map((p) => ({
      code: p.definition.code,
      label: p.definition.sidebarLabel,
      href: p.definition.href,
      iconName: p.definition.iconName,
      daysLeftInTrial: p.daysLeftInTrial,
    }));

  return (
    <ToastProvider>
      <StagingBanner />
      <div className="flex min-h-screen bg-ink-100">
        <Sidebar plugins={sidebarPlugins} />
        <div className="flex min-w-0 flex-1 flex-col">
          <ImpersonationBanner />
          <Topbar
            userName={user.fullName || user.email}
            activeBusinessId={active.businessId}
            sessionTimeoutMinutes={user.sessionTimeoutMinutes}
            businesses={memberships.map((m) => ({
              id: m.businessId,
              label: m.business.tradeName ?? m.business.legalName,
            }))}
          />
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1400px] px-3 py-5 sm:px-4 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </div>

        {needsActivation && (
          <ActivationGate
            devMode={env.NODE_ENV !== "production"}
            hasPhone={hasPhone}
          />
        )}
      </div>
    </ToastProvider>
  );
}
