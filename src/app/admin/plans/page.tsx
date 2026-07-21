import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton, Button } from "@/components/ui/Button";
import { money } from "@/lib/format";
import { deletePlanAction } from "@/app/admin/billing/actions";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  await requireAdmin("super_admin");

  const plans = await prisma.platformPlan.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { subscriptions: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Πακέτα πλατφόρμας"
        subtitle="Πακέτα που πωλούμε στις επιχειρήσεις-χρήστες."
        actions={
          <LinkButton href="/admin/plans/new" icon={Plus}>
            Νέο πακέτο
          </LinkButton>
        }
      />

      {plans.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <p className="text-lg font-semibold text-ink-900">
              Δεν έχει οριστεί κανένα πακέτο.
            </p>
            <p className="mt-1 text-sm text-ink-700">
              Δημιούργησε ένα Starter/Business/Advanced για να αναθέτεις
              συνδρομές στις επιχειρήσεις.
            </p>
            <div className="mt-6">
              <LinkButton href="/admin/plans/new" icon={Plus}>
                Νέο πακέτο
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Πακέτο</th>
                  <th>Κωδικός</th>
                  <th className="text-right">Τιμή/μήνα</th>
                  <th className="text-right">Τιμή/έτος</th>
                  <th className="text-right">Παραστ./μήνα</th>
                  <th className="text-right">Συνδρομές</th>
                  <th>Κατάσταση</th>
                  <th className="text-right" />
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/admin/plans/${p.id}`}
                        className="font-semibold text-brand-800 hover:text-brand-900"
                      >
                        {p.name}
                      </Link>
                      {p.description && (
                        <div className="text-xs text-ink-500">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="mono">{p.code}</td>
                    <td className="text-right font-semibold">
                      {money(p.priceMonthly)}
                    </td>
                    <td className="text-right font-semibold">
                      {money(p.priceYearly)}
                    </td>
                    <td className="text-right">
                      {p.includedDocsMonth === 0
                        ? "∞"
                        : p.includedDocsMonth}
                    </td>
                    <td className="text-right">
                      {p._count.subscriptions}
                    </td>
                    <td>
                      {p.active ? (
                        <Badge tone="success">Ενεργό</Badge>
                      ) : (
                        <Badge tone="muted">Ανενεργό</Badge>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <LinkButton
                          href={`/admin/plans/${p.id}`}
                          variant="secondary"
                          size="sm"
                          icon={Pencil}
                        >
                          Επεξεργασία
                        </LinkButton>
                        <form action={deletePlanAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            title={
                              p._count.subscriptions > 0
                                ? "Δεν διαγράφεται όσο υπάρχουν ενεργές συνδρομές"
                                : undefined
                            }
                          >
                            Διαγραφή
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
