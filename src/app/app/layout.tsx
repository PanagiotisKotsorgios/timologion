import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { VerifyEmailBanner } from "@/components/layout/VerifyEmailBanner";
import { ActivationGate } from "./ActivationGate";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { fullName: true, email: true },
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

  return (
    <div className="flex min-h-screen bg-ink-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <VerifyEmailBanner />
        <ImpersonationBanner />
        <Topbar
          userName={user.fullName || user.email}
          activeBusinessId={active.businessId}
          businesses={memberships.map((m) => ({
            id: m.businessId,
            label: m.business.tradeName ?? m.business.legalName,
          }))}
        />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 md:px-6 md:py-8">
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
  );
}
