import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan, can } from "@/lib/rbac";
import { Pencil, Tag as TagIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { ClientForm } from "../ClientForm";
import { TagPicker } from "../TagPicker";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const { id } = await params;
  const { edit } = await searchParams;

  const client = await prisma.client.findFirst({
    where: { id, businessId: ctx.businessId },
    include: {
      _count: { select: { documents: true } },
      tagLinks: { include: { tag: true } },
    },
  });

  if (!client) notFound();

  const allTags = await prisma.tag.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { label: "asc" },
  });

  const isEditing = edit === "1" && can(ctx.role, "client:write");

  return (
    <>
      <PageHeader
        title={client.legalName}
        subtitle={
          client.vatNumber ? `ΑΦΜ ${client.vatNumber}` : "Πελάτης χωρίς ΑΦΜ"
        }
        actions={
          !isEditing && can(ctx.role, "client:write") ? (
            <LinkButton href={`/app/clients/${client.id}?edit=1`} icon={Pencil}>
              Επεξεργασία
            </LinkButton>
          ) : null
        }
      />

      {isEditing ? (
        <Card>
          <CardBody>
            <ClientForm mode="edit" initial={client} />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader title="Στοιχεία" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <Detail label="Νόμιμη επωνυμία" value={client.legalName} />
                <Detail label="Διακριτικός τίτλος" value={client.tradeName} />
                <Detail label="ΑΦΜ" value={client.vatNumber} />
                <Detail label="ΔΟΥ" value={client.taxOffice} />
                <Detail label="Δραστηριότητα" value={client.activity} />
                <Detail label="Email" value={client.email} />
                <Detail label="Τηλέφωνο" value={client.phone} />
                <Detail
                  label="Διεύθυνση"
                  value={[client.addressLine, client.postalCode, client.city]
                    .filter(Boolean)
                    .join(", ")}
                />
              </CardBody>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader title="Δραστηριότητα" />
              <CardBody>
                <Detail
                  label="Παραστατικά"
                  value={String(client._count.documents)}
                />
                {client.notes && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-ink-500">Σημειώσεις</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink-700">
                      {client.notes}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>

            {can(ctx.role, "client:write") && (
              <Card>
                <CardHeader
                  title="Ετικέτες"
                  action={<TagIcon size={16} className="text-ink-500" />}
                />
                <CardBody>
                  <TagPicker
                    clientId={client.id}
                    allTags={allTags.map((t) => ({
                      id: t.id,
                      label: t.label,
                      color: t.color,
                    }))}
                    initialSelected={client.tagLinks.map((l) => l.tagId)}
                  />
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm text-ink-900">
        {value && value.length > 0 ? value : "—"}
      </p>
    </div>
  );
}
