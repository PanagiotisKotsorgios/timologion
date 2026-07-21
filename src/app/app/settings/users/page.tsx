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

  const canEditRole = can(ctx.role, "member:update_role");

  return (
    <>
      <PageHeader
        title="Χρήστες"
        subtitle="Πρόσθεσε συνεργάτες και όρισε ρόλους."
      />

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
                        <RoleSelect
                          memberId={m.id}
                          role={m.role}
                          disabled={!canEditRole || isSelf}
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
