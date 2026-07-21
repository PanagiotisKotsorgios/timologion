import Link from "next/link";
import { Plus, Play, Pause, Trash2, Zap } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton, Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { date } from "@/lib/format";
import { t } from "@/lib/i18n";
import {
  toggleRecurringStatusAction,
  deleteRecurringAction,
  generateFromRecurringAction,
} from "./actions";

export const dynamic = "force-dynamic";

const CADENCE_LABEL: Record<string, string> = {
  weekly: "Εβδομαδιαία",
  monthly: "Μηνιαία",
  quarterly: "Τριμηνιαία",
  yearly: "Ετήσια",
};

export default async function RecurringPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const items = await prisma.recurringDocument.findMany({
    where: { businessId: ctx.businessId },
    orderBy: [{ status: "asc" }, { nextRunAt: "asc" }],
    include: { client: { select: { legalName: true } } },
  });

  return (
    <>
      <PageHeader
        title="Επαναλαμβανόμενα παραστατικά"
        subtitle="Πρότυπα που παράγουν αυτόματα πρόχειρα σε τακτά διαστήματα."
        actions={
          <LinkButton href="/app/documents/repeating/new" icon={Plus}>
            Νέο πρότυπο
          </LinkButton>
        }
      />

      <Card className="overflow-hidden">
        <CardBody className="p-0">
          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Δεν υπάρχουν επαναλαμβανόμενα ακόμη."
                description="Δημιούργησε ένα πρότυπο για μια συνδρομή, μηνιαία υπηρεσία ή περιοδική χρέωση."
                action={
                  <LinkButton
                    href="/app/documents/repeating/new"
                    icon={Plus}
                  >
                    Νέο πρότυπο
                  </LinkButton>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Πρότυπο</th>
                    <th>Πελάτης</th>
                    <th>Τύπος</th>
                    <th>Συχνότητα</th>
                    <th>Επόμενη έκδοση</th>
                    <th>Κατάσταση</th>
                    <th className="text-right">Ενέργειες</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <Link
                          href={`/app/documents/repeating/${it.id}`}
                          className="font-semibold text-brand-800 hover:text-brand-900"
                        >
                          {it.label}
                        </Link>
                        {it.lastRunAt && (
                          <div className="text-xs text-ink-500">
                            Τελευταία: {date(it.lastRunAt)}
                          </div>
                        )}
                      </td>
                      <td>{it.client.legalName}</td>
                      <td>{t.documents.types[it.type]}</td>
                      <td>
                        <Badge tone="neutral">
                          {CADENCE_LABEL[it.cadence]}
                        </Badge>
                      </td>
                      <td className="mono">{date(it.nextRunAt)}</td>
                      <td>
                        {it.status === "active" ? (
                          <Badge tone="success">Ενεργό</Badge>
                        ) : it.status === "paused" ? (
                          <Badge tone="warning">Σε παύση</Badge>
                        ) : (
                          <Badge tone="muted">Λήξη</Badge>
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <form action={generateFromRecurringAction}>
                            <input type="hidden" name="id" value={it.id} />
                            <Button
                              type="submit"
                              variant="secondary"
                              size="sm"
                              icon={Zap}
                            >
                              Έκδοση τώρα
                            </Button>
                          </form>
                          <form action={toggleRecurringStatusAction}>
                            <input type="hidden" name="id" value={it.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              icon={it.status === "active" ? Pause : Play}
                              title={
                                it.status === "active"
                                  ? "Παύση"
                                  : "Ενεργοποίηση"
                              }
                            >
                              <span className="sr-only">
                                {it.status === "active" ? "Παύση" : "Ενεργοποίηση"}
                              </span>
                            </Button>
                          </form>
                          <form action={deleteRecurringAction}>
                            <input type="hidden" name="id" value={it.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                            >
                              <span className="sr-only">Διαγραφή</span>
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
