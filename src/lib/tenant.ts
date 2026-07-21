import { redirect } from "next/navigation";
import type { BusinessRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession, destroySession } from "@/lib/auth/session";

export type TenantContext = {
  userId: string;
  sessionId: string;
  businessId: string;
  role: BusinessRole;
  businessName: string;
};

/**
 * Resolves the current authenticated user + active business. Redirects the user
 * to /login if unauthenticated, /app/onboarding if they have no business yet,
 * or /app/switch-business if their active-business setting is stale.
 */
export async function requireTenant(): Promise<TenantContext> {
  const session = await getSession();
  if (!session) redirect("/login");

  // Bounce if the user has been banned mid-session.
  const account = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { suspendedAt: true },
  });
  if (account?.suspendedAt) {
    await destroySession();
    redirect("/login?banned=1");
  }

  const memberships = await prisma.businessMember.findMany({
    where: { userId: session.userId },
    include: {
      business: { select: { id: true, legalName: true, tradeName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) redirect("/app/onboarding");

  let active =
    memberships.find((m) => m.businessId === session.activeBusinessId) ??
    memberships[0]!;

  // If session had a stale active business, silently reset to first membership.
  if (session.activeBusinessId !== active.businessId) {
    await prisma.session.update({
      where: { id: session.sessionId },
      data: { activeBusinessId: active.businessId },
    });
  }

  return {
    userId: session.userId,
    sessionId: session.sessionId,
    businessId: active.businessId,
    role: active.role,
    businessName: active.business.tradeName ?? active.business.legalName,
  };
}

export async function listMyBusinesses(userId: string) {
  return prisma.businessMember.findMany({
    where: { userId },
    include: {
      business: { select: { id: true, legalName: true, tradeName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}
