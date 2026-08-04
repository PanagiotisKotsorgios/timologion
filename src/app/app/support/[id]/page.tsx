import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { TenantReplyForm } from "./TenantReplyForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  open: "Ανοικτό",
  waiting_customer: "Περιμένει εσένα",
  waiting_support: "Ελέγχεται",
  resolved: "Επιλύθηκε",
  closed: "Κλειστό",
};

export default async function TenantTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  const { id } = await params;

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id,
      OR: [{ userId: ctx.userId }, { businessId: ctx.businessId }],
    },
    include: {
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!ticket) notFound();

  const closed = ticket.status === "closed";

  return (
    <>
      <PageHeader
        title={ticket.subject}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <Badge tone="brand">
              {STATUS_LABEL[ticket.status] ?? ticket.status}
            </Badge>
            <span className="text-xs text-ink-500">
              Ενημερώθηκε {ticket.updatedAt.toLocaleString("el-GR")}
            </span>
          </span>
        }
        actions={
          <LinkButton
            href="/app/support"
            variant="secondary"
            icon={ArrowLeft}
          >
            Πίσω
          </LinkButton>
        }
      />

      <Card className="mb-6">
        <CardHeader title="Ιστορικό" />
        <CardBody className="space-y-4">
          {ticket.messages.map((m) => (
            <div
              key={m.id}
              className={
                "rounded-xl border-2 p-4 " +
                (m.senderId
                  ? "border-brand-300 bg-brand-50"
                  : "border-ink-300 bg-white")
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-widest">
                  {m.senderId ? (
                    <span className="text-brand-800">
                      Support · {m.senderName ?? "timologion"}
                    </span>
                  ) : (
                    <span className="text-ink-800">
                      Εσύ · {m.senderName ?? m.senderEmail}
                    </span>
                  )}
                </p>
                <span className="text-xs text-ink-500">
                  {m.createdAt.toLocaleString("el-GR")}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-900">
                {m.body}
              </p>
            </div>
          ))}
        </CardBody>
      </Card>

      {closed ? (
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-ink-500">
              Αυτό το αίτημα έχει κλείσει. Άνοιξε νέο από τη{" "}
              <Link href="/app/support" className="text-brand-800 hover:text-brand-900">
                σελίδα υποστήριξης
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Απάντηση" />
          <CardBody>
            <TenantReplyForm ticketId={ticket.id} />
          </CardBody>
        </Card>
      )}
    </>
  );
}
