import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { OverrideForm } from "./OverrideForm";
import { deleteOverrideAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminRateLimitsPage() {
  await requireAdmin("super_admin");

  const overrides = await prisma.rateLimitOverride.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      business: {
        select: { id: true, legalName: true, vatNumber: true },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Rate limits"
        subtitle="Overrides per επιχείρηση + action. Χρησιμοποιείται από consumeForBusiness()."
      />

      <Alert tone="info" title="Πώς λειτουργεί">
        Το bucket token-limiter διαβάζει πρώτα εδώ. Αν υπάρχει row για
        (businessId, action), χρησιμοποιεί capacity/refillMs από αυτό.
        Αλλιώς πέφτει στα defaults του κώδικα. Παραδείγματα actions:{" "}
        <code className="mono text-xs">api</code>,{" "}
        <code className="mono text-xs">wrapp_issue</code>,{" "}
        <code className="mono text-xs">export_bulk</code>.
      </Alert>

      <Card className="mt-6">
        <CardHeader title="Νέο override" />
        <CardBody>
          <OverrideForm />
        </CardBody>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title={`Ενεργά overrides (${overrides.length})`} />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2 text-left">Επιχείρηση</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-right">Capacity</th>
                <th className="px-4 py-2 text-right">Refill (ms)</th>
                <th className="px-4 py-2 text-left">Σχόλιο</th>
                <th className="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {overrides.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-ink-500">
                    Δεν υπάρχουν overrides — όλες οι επιχειρήσεις χρησιμοποιούν
                    τα defaults.
                  </td>
                </tr>
              )}
              {overrides.map((o) => (
                <tr key={o.id} className="hover:bg-ink-100/40">
                  <td className="px-4 py-2">
                    <a
                      href={`/admin/businesses/${o.business.id}`}
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      {o.business.legalName}
                    </a>
                    <p className="mono text-xs text-ink-500">
                      ΑΦΜ {o.business.vatNumber}
                    </p>
                  </td>
                  <td className="px-4 py-2 mono text-xs">{o.action}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {o.capacity}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {o.refillMs.toLocaleString("el-GR")}
                  </td>
                  <td className="px-4 py-2 text-ink-700 max-w-xs truncate" title={o.note ?? ""}>
                    {o.note ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={deleteOverrideAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <button
                        type="submit"
                        className="text-xs font-bold text-red-700 hover:text-red-900"
                      >
                        Διαγραφή
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </>
  );
}
