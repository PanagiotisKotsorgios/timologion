import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const ctx = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-ink-100">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar userName={ctx.fullName || ctx.email} role={ctx.role} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 md:px-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
