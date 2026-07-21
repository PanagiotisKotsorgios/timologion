import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { AnnouncementForm } from "../AnnouncementForm";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("super_admin", "support");
  const { id } = await params;
  const row = await prisma.platformAnnouncement.findUnique({
    where: { id },
  });
  if (!row) notFound();

  return (
    <>
      <PageHeader
        title="Επεξεργασία ανακοίνωσης"
        subtitle={
          row.publishedAt
            ? "Δημοσιευμένη — θα ενημερωθεί για όλους μετά την αποθήκευση."
            : "Πρόχειρη — δεν φαίνεται ακόμη στους χρήστες."
        }
      />
      <Card>
        <CardBody className="p-6 md:p-8">
          <AnnouncementForm
            initial={{
              id: row.id,
              tone: row.tone,
              title: row.title,
              body: row.body,
              ctaHref: row.ctaHref,
              ctaLabel: row.ctaLabel,
              publishedAt: row.publishedAt,
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
