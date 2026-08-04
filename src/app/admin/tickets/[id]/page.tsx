import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EntityNotes } from "@/components/admin/EntityNotes";
import { ReplyForm } from "./ReplyForm";
import { TicketControls } from "./TicketControls";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<
  string,
  "success" | "danger" | "warning" | "brand" | "muted"
> = {
  open: "brand",
  waiting_customer: "warning",
  waiting_support: "danger",
  resolved: "success",
  closed: "muted",
};

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAdmin("super_admin", "support");
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      business: { select: { id: true, legalName: true, vatNumber: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) notFound();

  const admins = await prisma.user.findMany({
    where: { platformRole: { not: null }, suspendedAt: null },
    select: { id: true, email: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <>
      <PageHeader
        title={ticket.subject}
        subtitle={`Από ${ticket.fromName ?? ticket.fromEmail} · ${ticket.messages.length} μηνύματα`}
        actions={
          <LinkButton
            href="/admin/tickets"
            variant="secondary"
            icon={ArrowLeft}
          >
            Πίσω
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader title="Κατάσταση & ανάθεση" />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[ticket.status] ?? "neutral"}>
                {ticket.status}
              </Badge>
              <Badge
                tone={
                  ticket.priority <= 2
                    ? "danger"
                    : ticket.priority === 3
                      ? "warning"
                      : "muted"
                }
              >
                priority {ticket.priority}
              </Badge>
              {ticket.category && (
                <Badge tone="neutral">{ticket.category}</Badge>
              )}
            </div>

            <TicketControls
              ticketId={ticket.id}
              currentStatus={ticket.status}
              currentPriority={ticket.priority}
              currentAssignee={ticket.assignedToId}
              currentCategory={ticket.category ?? ""}
              admins={admins.map((a) => ({
                id: a.id,
                label: a.fullName || a.email,
              }))}
              selfId={ctx.userId}
            />
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader title="Πληροφορίες" />
          <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Email">
              <a
                href={`mailto:${ticket.fromEmail}`}
                className="inline-flex items-center gap-1 text-brand-800 hover:text-brand-900"
              >
                <Mail size={12} />
                {ticket.fromEmail}
              </a>
            </Info>
            <Info label="Όνομα">{ticket.fromName ?? "—"}</Info>
            <Info label="Επιχείρηση">
              {ticket.business ? (
                <Link
                  href={`/admin/businesses/${ticket.business.id}`}
                  className="text-brand-800 hover:text-brand-900"
                >
                  {ticket.business.legalName} · ΑΦΜ {ticket.business.vatNumber}
                </Link>
              ) : (
                "—"
              )}
            </Info>
            <Info label="User">
              {ticket.userId ? (
                <Link
                  href={`/admin/users/${ticket.userId}`}
                  className="mono text-xs text-brand-800 hover:text-brand-900"
                >
                  {ticket.userId.slice(-8)}
                </Link>
              ) : (
                "—"
              )}
            </Info>
            <Info label="Δημιουργήθηκε">
              {ticket.createdAt.toLocaleString("el-GR")}
            </Info>
            <Info label="Ενημερώθηκε">
              {ticket.updatedAt.toLocaleString("el-GR")}
            </Info>
          </CardBody>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Ιστορικό συνομιλίας" />
        <CardBody className="space-y-4">
          {ticket.messages.map((m) => (
            <div
              key={m.id}
              className={
                "rounded-xl border-2 p-4 " +
                (m.isInternal
                  ? "border-amber-300 bg-amber-50"
                  : m.senderId
                    ? "border-brand-300 bg-brand-50"
                    : "border-ink-300 bg-white")
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-widest">
                  {m.isInternal ? (
                    <span className="text-amber-800">Internal note</span>
                  ) : m.senderId ? (
                    <span className="text-brand-800">Support · {m.senderName ?? m.senderEmail}</span>
                  ) : (
                    <span className="text-ink-800">Customer · {m.senderName ?? m.senderEmail}</span>
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

      <Card>
        <CardHeader
          title="Απάντηση"
          subtitle="Public reply στέλνει email στον πελάτη. Internal note μένει μόνο εδώ."
        />
        <CardBody>
          <ReplyForm
            ticketId={ticket.id}
            customerEmail={ticket.fromEmail}
            senderName={ctx.fullName || ctx.email}
          />
        </CardBody>
      </Card>

      <div className="mt-6">
        <EntityNotes
          entityType="SupportTicket"
          entityId={ticket.id}
          title="Εσωτερικές σημειώσεις ticket"
        />
      </div>
    </>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p className="mt-0.5 text-ink-900">{children}</p>
    </div>
  );
}
