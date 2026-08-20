import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan, can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { InviteForm } from "./InviteForm";
import { RoleSelect } from "./RoleSelect";
import { date } from "@/lib/format";

export default async function UsersSettingsPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "member:invite");

  const members = await prisma.businessMember.findMany({
    where: { businessId: ctx.businessId },
    include: {
      user: { select: { id: true, email: true, fullName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Kept for one-line re-enable when multi-user exits beta — see the
  // <RoleSelect> disabled={true} below and this file's beta banner.
  const canEditRole = can(ctx.role, "member:update_role");
  void canEditRole;

  return (
    <>
      <PageHeader
        title="Χρήστες"
        subtitle="Πρόσθεσε συνεργάτες και όρισε ρόλους."
      />

      {/* Beta notice — role-based collaboration is wired end-to-end
          in the DB + RBAC layer, but the invitation email + acceptance
          flow + team-level notification routing still need polish before
          we recommend it for daily use. Warn tenants explicitly so no
          one relies on it in production yet. Remove this banner when
          the "invite → accept via email → assigned role" loop is
          shipped. */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 md:p-5">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-400 text-amber-950">
          <AlertTriangle size={18} strokeWidth={2.5} aria-hidden />
        </span>
        <div className="flex-1 space-y-1 text-sm text-amber-950">
          <p className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-amber-600 bg-amber-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-900">
              Beta · Έρχεται σύντομα
            </span>
            <strong className="font-black">
              Η λειτουργία πολλαπλών χρηστών είναι σε φάση δοκιμών.
            </strong>
          </p>
          <p className="leading-relaxed">
            Οι ρόλοι και οι προσκλήσεις δεν λειτουργούν πλήρως ακόμα — η
            πρόσβαση συνεργατών ενδέχεται να μην ενημερώνεται άμεσα.
            Χρησιμοποίησέ το μόνο για δοκιμές. Το πλήρες onboarding
            συνεργατών (invite email + αποδοχή) έρχεται σύντομα.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Προσθήκη μέλους"
            subtitle="Ο χρήστης πρέπει να έχει ήδη λογαριασμό στο timologion."
          />
          <CardBody>
            <InviteForm />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Μέλη (${members.length})`} />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">Όνομα</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Ρόλος</th>
                  <th className="px-4 py-2 text-left">Ημ. προσθήκης</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {members.map((m) => {
                  const isSelf = m.user.id === ctx.userId;
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-2 font-medium text-ink-900">
                        {m.user.fullName || "—"}
                        {isSelf && (
                          <span className="ml-1 text-xs text-ink-500">
                            (εσύ)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-ink-700">{m.user.email}</td>
                      <td className="px-4 py-2">
                        {/* Locked during beta — the amber banner at the
                            top explains why. When multi-user ships,
                            restore `disabled={!canEditRole || isSelf}`. */}
                        <RoleSelect
                          memberId={m.id}
                          role={m.role}
                          disabled
                        />
                      </td>
                      <td className="px-4 py-2 text-ink-700">
                        {date(m.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
