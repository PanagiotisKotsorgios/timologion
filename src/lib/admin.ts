import { redirect } from "next/navigation";
import type { PlatformRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export type AdminContext = {
  userId: string;
  sessionId: string;
  fullName: string;
  email: string;
  role: PlatformRole;
};

/**
 * Server-only. Resolves the current session and requires the user to hold any
 * PlatformRole. Non-admins are bounced to /app; unauthenticated users to /login.
 */
export async function requireAdmin(
  ...allowed: PlatformRole[]
): Promise<AdminContext> {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      platformRole: true,
    },
  });

  if (!user || !user.platformRole) {
    redirect("/app");
  }

  if (allowed.length > 0 && !allowed.includes(user.platformRole)) {
    redirect("/admin");
  }

  return {
    userId: user.id,
    sessionId: session.sessionId,
    fullName: user.fullName,
    email: user.email,
    role: user.platformRole,
  };
}

// Capability matrix mirroring the RBAC style used for tenant roles.
export type AdminAction =
  | "admin:read"
  | "admin:manage_users"
  | "admin:manage_admins"
  | "admin:manage_businesses"
  | "admin:read_audit"
  | "admin:read_economics";

const MATRIX: Record<PlatformRole, ReadonlySet<AdminAction>> = {
  super_admin: new Set<AdminAction>([
    "admin:read",
    "admin:manage_users",
    "admin:manage_admins",
    "admin:manage_businesses",
    "admin:read_audit",
    "admin:read_economics",
  ]),
  support: new Set<AdminAction>([
    "admin:read",
    "admin:manage_users",
    "admin:manage_businesses",
    "admin:read_audit",
  ]),
  analyst: new Set<AdminAction>([
    "admin:read",
    "admin:read_audit",
    "admin:read_economics",
  ]),
};

export function canAdmin(role: PlatformRole, action: AdminAction): boolean {
  return MATRIX[role].has(action);
}

export function assertAdminCan(role: PlatformRole, action: AdminAction) {
  if (!canAdmin(role, action)) {
    throw new Error(`Δεν έχεις δικαίωμα platform admin για: ${action}`);
  }
}
