import { LifeBuoy } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { NewTicketForm } from "./NewTicketForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  open: "Ανοικτό",
  waiting_customer: "Περιμένει εσένα",
  waiting_support: "Ελέγχεται",
  resolved: "Επιλύθηκε",
  closed: "Κλειστό",
};

export default async function TenantSupportPage() {
  const ctx = await requireTenant();
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true, fullName: true },
  });

  const tickets = await prisma.supportTicket.findMany({
    where: {
      OR: [{ userId: ctx.userId }, { businessId: ctx.businessId }],
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return (
    <>
      <PageHeader
        title="Υποστήριξη"
        subtitle="Ζήτα βοήθεια ή δες τα τελευταία σου tickets."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader
            title="Νέο ticket"
            subtitle="Θα σου απαντήσουμε στο email του λογαριασμού σου."
          />
          <CardBody>
            <NewTicketForm
              defaultEmail={user?.email ?? ""}
              defaultName={user?.fullName ?? ""}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Τα ticket σου"
            action={<LifeBuoy size={18} className="text-ink-500" aria-hidden />}
          />
          <CardBody className="p-0">
            {tickets.length === 0 ? (
              <p className="p-6 text-sm text-ink-500">
                Δεν έχεις ανοικτό ticket ακόμη.
              </p>
            ) : (
              <ul className="divide-y divide-ink-200">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/app/support/${t.id}`}
                      className="block p-3 hover:bg-ink-100/40"
                    >
                      <p className="text-sm font-semibold text-ink-900">
                        {t.subject}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge tone="brand">
                          {STATUS_LABEL[t.status] ?? t.status}
                        </Badge>
                        <span className="text-[11px] text-ink-500">
                          {t.updatedAt.toLocaleDateString("el-GR")}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
