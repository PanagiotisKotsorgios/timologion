import { LifeBuoy, Mail, Phone, MessageCircle } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { NewTicketForm } from "./NewTicketForm";

// Central contact channels — kept alongside the ticket flow for users
// who'd rather email or call than open a formal request. Change any
// value here and every user surface picks it up immediately (no
// search-and-replace across the app).
const SUPPORT_EMAIL = "support@timologion.gr";
const SUPPORT_PHONE_DISPLAY = "+30 6986 788 178";
const SUPPORT_PHONE_TEL = "+306986788178";
const SUPPORT_HOURS = "Δευτ–Παρ 09:00–18:00";

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
        subtitle="Ζήτα βοήθεια ή δες τα τελευταία σου αιτήματα."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader
            title="Νέο αίτημα"
            subtitle="Θα σου απαντήσουμε στο email του λογαριασμού σου."
          />
          <CardBody>
            <NewTicketForm
              defaultEmail={user?.email ?? ""}
              defaultName={user?.fullName ?? ""}
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          {/* Direct contact — for users who prefer email/phone over
              opening a formal ticket. Ticket flow is still the primary
              path (we can track + threaded reply), but not everyone
              wants to fill in a form for a quick question. */}
          <Card>
            <CardHeader
              title="Απευθείας επικοινωνία"
              subtitle="Αν προτιμάς email ή τηλέφωνο αντί για αίτημα."
              action={
                <MessageCircle size={18} className="text-ink-500" aria-hidden />
              }
            />
            <CardBody className="space-y-3 text-sm">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-start gap-3 rounded-lg border-2 border-ink-200 bg-white p-3 transition-colors hover:border-brand-500 hover:bg-brand-50/40"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-900">
                  <Mail size={16} strokeWidth={2.5} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
                    Email
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-brand-900">
                    {SUPPORT_EMAIL}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-600">
                    Απάντηση εντός μιας εργάσιμης ημέρας.
                  </p>
                </div>
              </a>
              <a
                href={`tel:${SUPPORT_PHONE_TEL}`}
                className="flex items-start gap-3 rounded-lg border-2 border-ink-200 bg-white p-3 transition-colors hover:border-brand-500 hover:bg-brand-50/40"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-900">
                  <Phone size={16} strokeWidth={2.5} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
                    Τηλέφωνο
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-brand-900">
                    {SUPPORT_PHONE_DISPLAY}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-600">
                    {SUPPORT_HOURS}
                  </p>
                </div>
              </a>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Τα αιτήματά σου"
              action={<LifeBuoy size={18} className="text-ink-500" aria-hidden />}
            />
            <CardBody className="p-0">
              {tickets.length === 0 ? (
                <p className="p-6 text-sm text-ink-500">
                  Δεν έχεις ανοικτό αίτημα ακόμη.
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
      </div>
    </>
  );
}
