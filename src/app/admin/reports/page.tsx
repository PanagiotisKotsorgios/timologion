import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { ReportRunner } from "./ReportRunner";

export const dynamic = "force-dynamic";

const REPORTS = [
  {
    id: "vat_summary",
    title: "Σύνοψη ΦΠΑ ανά περίοδο",
    description:
      "Ανά επιχείρηση: καθαρές αξίες, ΦΠΑ, σύνολα ομαδοποιημένα ανά συντελεστή. Χρήσιμο για ελεγκτικές διασταυρώσεις.",
    fields: ["businessId", "period"],
  },
  {
    id: "annual_income",
    title: "Ετήσια σύνοψη εσόδων/εξόδων",
    description:
      "Ένα φύλλο ανά έτος με συνολικά έσοδα, έξοδα, καθαρό αποτέλεσμα, ΦΠΑ εισερχόμενο/εξερχόμενο.",
    fields: ["businessId", "year"],
  },
  {
    id: "platform_margin",
    title: "Περιθώριο πλατφόρμας (cross-tenant)",
    description:
      "Ανά επιχείρηση: έσοδα platform-invoices vs κόστη παρόχου, margin, MRR contribution. Δεν φιλτράρεται.",
    fields: ["period"],
  },
];

export default async function AdminReportsPage() {
  await requireAdmin("super_admin", "analyst");

  return (
    <>
      <PageHeader
        title="Αναφορές"
        subtitle="XLSX εξαγωγές για accountant, ελεγκτή ή internal review."
      />

      <Alert tone="info">
        Οι αναφορές τρέχουν live στη βάση και επιστρέφουν XLSX. Για μεγάλες
        χρονικές περιόδους ίσως πάρει λίγα δευτερόλεπτα.
      </Alert>

      <div className="mt-6 space-y-6">
        {REPORTS.map((r) => (
          <Card key={r.id}>
            <CardHeader title={r.title} subtitle={r.description} />
            <CardBody>
              <ReportRunner
                reportId={r.id}
                needsBusiness={r.fields.includes("businessId")}
                needsPeriod={r.fields.includes("period")}
                needsYear={r.fields.includes("year")}
              />
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
