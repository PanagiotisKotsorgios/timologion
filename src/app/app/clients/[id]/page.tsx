import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan, can } from "@/lib/rbac";
import { Pencil, Tag as TagIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { ExportMenu } from "@/components/ui/ExportMenu";
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
          !isEditing ? (
            <>
              <ExportMenu
                baseUrl={`/api/export/client/${client.id}`}
                formats={["xlsx", "pdf"]}
                label="Εξαγωγή καρτέλας"
              />
              {can(ctx.role, "client:write") && (
                <LinkButton
                  href={`/app/clients/${client.id}?edit=1`}
                  icon={Pencil}
                >
                  Επεξεργασία
                </LinkButton>
              )}
            </>
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
        <div className="grid gap-6 md:gap-8 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <Card>
              <CardHeader title="Στοιχεία" />
              <CardBody className="grid gap-4 p-5 sm:grid-cols-2 sm:gap-6 sm:p-6 md:p-8">
                <Detail label="Νόμιμη επωνυμία" value={client.legalName} />
                <Detail label="Διακριτικός τίτλος" value={client.tradeName} />
                <Detail label="ΑΦΜ" value={client.vatNumber} mono />
                <Detail label="ΔΟΥ" value={client.taxOffice} />
                <Detail label="Δραστηριότητα" value={client.activity} />
                <Detail label="Email" value={client.email} />
                <Detail label="Τηλέφωνο" value={client.phone} mono />
                <Detail
                  label="Διεύθυνση"
                  value={[client.addressLine, client.postalCode, client.city]
                    .filter(Boolean)
                    .join(", ")}
                />
              </CardBody>
            </Card>
          </div>
          <div className="space-y-8">
            <Card>
              <CardHeader title="Δραστηριότητα" />
              <CardBody className="p-6 md:p-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-ink-500">
                    Παραστατικά
                  </p>
                  <p className="mt-2 text-4xl font-extrabold text-brand-900">
                    {client._count.documents}
                  </p>
                </div>
                {client.notes && (
                  <div className="mt-6 border-t-2 border-ink-200 pt-6">
                    <p className="text-sm font-semibold uppercase tracking-widest text-ink-500">
                      Σημειώσεις
                    </p>
                    <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-ink-900">
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
                  action={<TagIcon size={18} className="text-ink-500" />}
                />
                <CardBody className="p-6 md:p-8">
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
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  const empty = !value || value.length === 0;
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p
        className={
          "mt-2 text-lg leading-snug " +
          (empty ? "text-ink-400 " : "font-semibold text-ink-900 ") +
          (mono ? "mono" : "")
        }
      >
        {empty ? "—" : value}
      </p>
    </div>
  );
}
