import Link from "next/link";
import { LogOut, LayoutDashboard } from "lucide-react";
import type { PlatformRole } from "@prisma/client";
import { logoutAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AdminSidebarTrigger } from "./AdminSidebar";

const ROLE_LABEL: Record<PlatformRole, string> = {
  super_admin: "Super Admin",
  support: "Support",
  analyst: "Analyst",
};

const ROLE_TONE: Record<
  PlatformRole,
  "brand" | "warning" | "success" | "neutral"
> = {
  super_admin: "brand",
  support: "warning",
  analyst: "success",
};

export function AdminTopbar({
  userName,
  role,
}: {
  userName: string;
  role: PlatformRole;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b-2 border-ink-300 bg-white px-3 md:h-20 md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        <AdminSidebarTrigger />
        <span className="hidden text-base font-bold text-brand-900 md:inline">
          Platform Admin
        </span>
        <Badge tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>
        <Link
          href="/app"
          className="ml-2 hidden items-center gap-1.5 text-sm font-semibold text-brand-800 hover:text-brand-900 lg:inline-flex"
        >
          <LayoutDashboard size={14} aria-hidden />
          Εφαρμογή χρήστη
        </Link>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden text-right lg:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
            Χρήστης
          </p>
          <p className="text-base font-semibold text-ink-900">{userName}</p>
        </div>
        <form action={logoutAction}>
          <Button
            variant="danger"
            size="md"
            type="submit"
            icon={LogOut}
            className="px-3 md:px-5"
            aria-label="Αποσύνδεση"
          >
            <span className="hidden sm:inline">Αποσύνδεση</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
