import { ArrowLeft, CheckSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { TaskForm } from "../TaskForm";
import { TaskRow } from "../TaskRow";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const [tasks, members] = await Promise.all([
    prisma.crmTask.findMany({
      where: { businessId: ctx.businessId },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      include: {
        assignee: { select: { fullName: true } },
      },
      take: 200,
    }),
    prisma.businessMember.findMany({
      where: { businessId: ctx.businessId },
      include: { user: { select: { id: true, fullName: true } } },
    }),
  ]);

  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status !== "open");

  const assignees = members.map((m) => ({
    id: m.user.id,
    fullName: m.user.fullName,
  }));

  return (
    <>
      <PageHeader
        title="Εργασίες CRM"
        subtitle="Follow-ups, υπενθυμίσεις και ανοιχτές ενέργειες."
        actions={
          <LinkButton href="/app/crm" variant="secondary" icon={ArrowLeft}>
            Πίσω στο CRM
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardBody className="p-0">
              <div className="border-b-2 border-ink-200 px-6 py-4">
                <p className="text-sm font-bold uppercase tracking-widest text-ink-500">
                  Ανοιχτά ({open.length})
                </p>
              </div>
              {open.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckSquare className="mx-auto text-ink-400" size={32} />
                  <p className="mt-3 text-sm text-ink-500">
                    Κανένα ανοιχτό task.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-ink-200">
                  {open.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={{
                        id: t.id,
                        title: t.title,
                        description: t.description,
                        status: t.status,
                        dueAt: t.dueAt?.toISOString() ?? null,
                        reminderAt: t.reminderAt?.toISOString() ?? null,
                        assignee: t.assignee?.fullName ?? null,
                      }}
                    />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {done.length > 0 && (
            <Card>
              <CardBody className="p-0">
                <div className="border-b-2 border-ink-200 px-6 py-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-ink-500">
                    Ολοκληρωμένα ({done.length})
                  </p>
                </div>
                <ul className="divide-y divide-ink-200">
                  {done.slice(0, 20).map((t) => (
                    <TaskRow
                      key={t.id}
                      task={{
                        id: t.id,
                        title: t.title,
                        description: t.description,
                        status: t.status,
                        dueAt: t.dueAt?.toISOString() ?? null,
                        reminderAt: t.reminderAt?.toISOString() ?? null,
                        assignee: t.assignee?.fullName ?? null,
                      }}
                    />
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        <Card>
          <CardBody>
            <div className="mb-4 flex items-center gap-2">
              <CheckSquare size={18} className="text-brand-800" />
              <p className="text-lg font-bold text-brand-900">Νέο task</p>
            </div>
            <TaskForm assignees={assignees} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
