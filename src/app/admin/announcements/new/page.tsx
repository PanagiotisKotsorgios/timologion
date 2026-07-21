import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { AnnouncementForm } from "../AnnouncementForm";

export default async function NewAnnouncementPage() {
  await requireAdmin("super_admin", "support");
  return (
    <>
      <PageHeader
        title="Νέα ανακοίνωση"
        subtitle="Γράψε την ανακοίνωση και επίλεξε αν θα δημοσιευτεί άμεσα σε όλους."
      />
      <Card>
        <CardBody className="p-6 md:p-8">
          <AnnouncementForm />
        </CardBody>
      </Card>
    </>
  );
}
