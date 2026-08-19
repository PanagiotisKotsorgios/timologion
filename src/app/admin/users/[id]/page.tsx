import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Ban,
  CheckCircle,
  UserCog,
  KeyRound,
  Download,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EntityNotes } from "@/components/admin/EntityNotes";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { date } from "@/lib/format";
import {
  banUserAction,
  unbanUserAction,
  impersonateUserAction,
} from "@/app/admin/actions";
import { PurgeUserButton } from "./PurgeUserButton";
import {
  revokeSessionAction,
  revokeAllSessionsAction,
  forcePasswordResetAction,
} from "./session-actions";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [user, sessions, audit] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            business: {
              select: {
                id: true,
                legalName: true,
                tradeName: true,
                vatNumber: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.session.findMany({
      where: { userId: id },
      orderBy: { lastSeenAt: "desc" },
      take: 10,
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        expiresAt: true,
        lastSeenAt: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!user) notFound();

  // Sole-owned businesses = businesses where this user is the only
  // member. Used to warn the admin (in the purge modal) that clicking
  // through will also wipe those businesses + their data.
  const memberCounts = await Promise.all(
    user.memberships.map((m) =>
      prisma.businessMember.count({ where: { businessId: m.businessId } }),
    ),
  );
  const soleOwnedCount = memberCounts.filter((c) => c === 1).length;

  return (
    <>
      <PageHeader
        title={user.fullName || user.email}
        subtitle={user.email}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {user.platformRole && (
              <Badge tone="warning">{user.platformRole}</Badge>
            )}
            {!user.suspendedAt && (
              <>
                <form action={impersonateUserAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <Button
                    type="submit"
                    variant="secondary"
                    icon={UserCog}
                    title="Είσοδος ως αυτός ο χρήστης — μόνο super_admin"
                  >
                    Σύνδεση ως αυτός
                  </Button>
                </form>
                <form action={forcePasswordResetAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <Button
                    type="submit"
                    variant="secondary"
                    icon={KeyRound}
                    title="Στέλνει email επαναφοράς κωδικού στον χρήστη."
                  >
                    Αποστολή reset link
                  </Button>
                </form>
                <a
                  href={`/api/admin/users/${user.id}/gdpr-export`}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-4 text-sm font-bold text-ink-900 shadow-sm transition-colors hover:border-ink-500"
                  title="Πλήρες bundle δεδομένων χρήστη κατά Άρθρο 20 GDPR."
                >
                  <Download size={14} strokeWidth={2.5} aria-hidden />
                  GDPR export
                </a>
              </>
            )}
            {user.suspendedAt ? (
              <form action={unbanUserAction}>
                <input type="hidden" name="userId" value={user.id} />
                <Button
                  type="submit"
                  variant="secondary"
                  icon={CheckCircle}
                >
                  Άρση απαγόρευσης
                </Button>
              </form>
            ) : (
              <form action={banUserAction} className="flex gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <Input
                  name="reason"
                  placeholder="Αιτιολογία"
                  className="w-56"
                  maxLength={255}
                />
                <Button type="submit" variant="danger" icon={Ban}>
                  Απαγόρευση
                </Button>
              </form>
            )}
            {/* Permanent purge — separate control so it can never be
                confused with the (reversible) ban button. Confirms via
                type-the-email modal to prevent misclicks. */}
            <PurgeUserButton
              userId={user.id}
              userEmail={user.email}
              hasSoleOwnedBusinesses={soleOwnedCount > 0}
            />
          </div>
        }
      />

      {user.suspendedAt && (
        <div className="mb-6">
          <Alert
            tone="danger"
            title={`Απαγορευμένος χρήστης από ${date(user.suspendedAt)}`}
          >
            {user.suspendedReason || "Χωρίς αιτιολογία"}
          </Alert>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title={`Συμμετοχές (${user.memberships.length})`}
            />
            <CardBody className="p-0">
              {user.memberships.length === 0 ? (
                <p className="p-6 text-sm text-ink-500">
                  Ο χρήστης δεν είναι μέλος καμίας επιχείρησης.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Επιχείρηση</th>
                      <th className="px-4 py-2 text-left">ΑΦΜ</th>
                      <th className="px-4 py-2 text-left">Ρόλος</th>
                      <th className="px-4 py-2 text-left">Ημ/νία</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-300/60">
                    {user.memberships.map((m) => (
                      <tr key={m.id}>
                        <td className="px-4 py-2">
                          <Link
                            href={`/admin/businesses/${m.business.id}`}
                            className="font-medium text-brand-700 hover:text-brand-800"
                          >
                            {m.business.tradeName ?? m.business.legalName}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-ink-700">
                          {m.business.vatNumber}
                        </td>
                        <td className="px-4 py-2">
                          <Badge tone={m.role === "owner" ? "brand" : "neutral"}>
                            {m.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-ink-500">
                          {date(m.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Ενεργές συνεδρίες"
              action={
                sessions.length > 0 && (
                  <form action={revokeAllSessionsAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border-2 border-red-700 bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700"
                    >
                      Logout παντού
                    </button>
                  </form>
                )
              }
            />
            <CardBody className="p-0">
              {sessions.length === 0 ? (
                <p className="p-6 text-sm text-ink-500">
                  Χωρίς πρόσφατες συνεδρίες.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Τελ. δραστ.</th>
                      <th className="px-4 py-2 text-left">Λήγει</th>
                      <th className="px-4 py-2 text-left">IP</th>
                      <th className="px-4 py-2 text-left">User agent</th>
                      <th className="px-4 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-300/60">
                    {sessions.map((s) => {
                      const active = s.expiresAt.getTime() > Date.now();
                      return (
                        <tr key={s.id}>
                          <td className="px-4 py-2 text-ink-500">
                            {date(s.lastSeenAt)}
                          </td>
                          <td className="px-4 py-2 text-ink-500">
                            {date(s.expiresAt)}
                            {!active && (
                              <span className="ml-2 text-[10px] font-bold uppercase text-ink-400">
                                (ληγμένη)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-ink-700 font-mono text-xs">
                            {s.ipAddress ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-ink-500 max-w-[380px] truncate">
                            {s.userAgent ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {active && (
                              <form action={revokeSessionAction}>
                                <input
                                  type="hidden"
                                  name="sessionId"
                                  value={s.id}
                                />
                                <input
                                  type="hidden"
                                  name="userId"
                                  value={user.id}
                                />
                                <button
                                  type="submit"
                                  className="text-xs font-bold text-red-700 hover:text-red-900"
                                >
                                  Ακύρωση
                                </button>
                              </form>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <EntityNotes entityType="User" entityId={user.id} title="Σημειώσεις χρήστη" />

          <Card>
            <CardHeader title={`Audit (${audit.length})`} />
            <CardBody className="p-0">
              {audit.length === 0 ? (
                <p className="p-6 text-sm text-ink-500">
                  Καμία καταγεγραμμένη ενέργεια.
                </p>
              ) : (
                <ul className="divide-y divide-ink-300/60 text-sm">
                  {audit.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between px-4 py-2"
                    >
                      <div>
                        <span className="font-mono text-xs text-brand-700">
                          {a.action}
                        </span>
                        {a.entityType && (
                          <span className="ml-2 text-xs text-ink-500">
                            {a.entityType}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-ink-500">
                        {date(a.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Στοιχεία" />
            <CardBody className="space-y-3 text-sm">
              <Detail label="Email" value={user.email} />
              <Detail label="Όνομα" value={user.fullName} />
              <Detail
                label="Platform role"
                value={user.platformRole ?? "—"}
              />
              <Detail
                label="MFA"
                value={user.mfaEnabled ? "Ενεργό" : "Ανενεργό"}
              />
              <Detail label="Εγγραφή" value={date(user.createdAt)} />
              <Detail label="Ενημέρωση" value={date(user.updatedAt)} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-300/60 pb-2 last:border-b-0 last:pb-0">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-900">{value || "—"}</span>
    </div>
  );
}
