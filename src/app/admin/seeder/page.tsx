import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { env } from "@/lib/env";
import { SeederForm } from "./SeederForm";

export const dynamic = "force-dynamic";

export default async function AdminSeederPage() {
  await requireAdmin("super_admin");
  const isProd = env.NODE_ENV === "production";
  const envLabel = env.ENVIRONMENT_LABEL?.trim() ?? "";

  return (
    <>
      <PageHeader
        title="Test data seeder"
        subtitle="Δημιουργεί προκατασκευασμένη επιχείρηση με πελάτες, είδη και πρόχειρα παραστατικά για QA."
      />

      {isProd && !/staging|dev|local/i.test(envLabel) && (
        <Alert tone="danger" title="Είσαι σε παραγωγή">
          Ο seeder είναι σχεδιασμένος για staging/QA. Σε production αποφεύγει
          τη δημιουργία fake δεδομένων. Αν επιμένεις, χρησιμοποίησε την
          εντολή <code className="mono text-xs">npm run demo:seed</code> από
          το CLI.
        </Alert>
      )}

      <Card className="mt-6">
        <CardHeader
          title="Τρέξε τον seeder"
          subtitle="Κάθε εκτέλεση δημιουργεί καινούργια επιχείρηση — δεν αγγίζει υπάρχουσα δεδομένα."
        />
        <CardBody>
          <SeederForm blocked={isProd && !/staging|dev|local/i.test(envLabel)} />
        </CardBody>
      </Card>
    </>
  );
}
