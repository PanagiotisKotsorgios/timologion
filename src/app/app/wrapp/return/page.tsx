import { redirect } from "next/navigation";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { checkActivationAction } from "../../activation-actions";
import { ReturnPoller } from "./ReturnPoller";

export const dynamic = "force-dynamic";

/**
 * Landing page users return to after completing Wrapp onboarding.
 *
 * We proactively call checkActivationAction() to refresh the local state —
 * usually the webhook has already flipped it, but in case there's a delay,
 * this fetches the latest status from Wrapp's tenant_details endpoint.
 */
export default async function WrappReturnPage() {
  const ctx = await requireTenant();

  // Refresh state from Wrapp before rendering the outcome.
  try {
    await checkActivationAction();
  } catch {
    // Non-fatal — the page will still show whatever's currently in the DB.
  }

  const conn = await prisma.wrappConnection.findUnique({
    where: { businessId: ctx.businessId },
    select: {
      status: true,
      canIssueInvoice: true,
      hasPlan: true,
      lastVerifiedAt: true,
      lastError: true,
    },
  });

  const active = conn?.status === "active" && conn?.canIssueInvoice;
  const pending = conn?.status === "pending";

  if (active) {
    // Straight through to the dashboard — the activation gate will not appear.
    redirect("/app");
  }

  return (
    <>
      <PageHeader
        title="Επιστροφή από Wrapp"
        subtitle="Έλεγχος κατάστασης ενεργοποίησης."
      />

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardBody className="p-8 text-center md:p-12">
            {pending ? (
              <>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-800">
                  <Clock size={32} />
                </div>
                <h1 className="mt-6 text-2xl font-bold text-brand-900 md:text-3xl">
                  Ολοκληρώνεται η ενεργοποίηση
                </h1>
                <p className="mt-4 text-base text-ink-700">
                  Η Wrapp επιβεβαιώνει την πληρωμή και μας στέλνει τα
                  διαπιστευτήρια. Θα σε προωθήσουμε αυτόματα μόλις είναι
                  έτοιμο — μην κλείσεις τη σελίδα.
                </p>
                <ReturnPoller />
                <div className="mt-8 flex flex-col items-center gap-3">
                  <LinkButton href="/app" variant="secondary">
                    Επιστροφή στο dashboard
                  </LinkButton>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-800">
                  <AlertCircle size={32} />
                </div>
                <h1 className="mt-6 text-2xl font-bold text-brand-900 md:text-3xl">
                  Δεν εντοπίσαμε ενεργή σύνδεση
                </h1>
                <p className="mt-4 text-base text-ink-700">
                  Η ενεργοποίηση δεν ολοκληρώθηκε — μπορεί να ακυρώθηκε ή να
                  διακόπηκε στη διαδρομή. Δοκίμασε ξανά την ενεργοποίηση.
                </p>
                {conn?.lastError && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-left text-xs text-red-900">
                    Τελευταίο μήνυμα: {conn.lastError}
                  </p>
                )}
                <div className="mt-8 flex flex-col items-center gap-3">
                  <LinkButton href="/app">Επιστροφή για νέα ενεργοποίηση</LinkButton>
                </div>
              </>
            )}

            <p className="mt-8 text-xs text-ink-500">
              Τελευταίος έλεγχος:{" "}
              {conn?.lastVerifiedAt
                ? new Date(conn.lastVerifiedAt).toLocaleString("el-GR")
                : "—"}
            </p>
          </CardBody>
        </Card>

        {active && (
          <p className="mt-6 text-center text-sm text-emerald-800">
            <CheckCircle2 size={16} className="inline" /> Έτοιμο για έκδοση
            παραστατικών.
          </p>
        )}
      </div>
    </>
  );
}
