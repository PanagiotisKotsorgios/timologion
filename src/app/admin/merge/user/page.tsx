import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { MergeUserForm } from "./MergeUserForm";

export const dynamic = "force-dynamic";

export default async function AdminMergeUserPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  await requireAdmin("super_admin");
  const { email } = await searchParams;
  if (!email) notFound();

  // Case-insensitive match — that's how we detected the duplicate.
  const candidates = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      email: string;
      fullName: string;
      platformRole: string | null;
      suspendedAt: Date | null;
      createdAt: Date;
    }>
  >(
    `SELECT id, email, fullName, platformRole, suspendedAt, createdAt
     FROM users
     WHERE LOWER(email) = LOWER(?)
     ORDER BY createdAt ASC`,
    email,
  );

  if (candidates.length < 2) {
    return (
      <>
        <PageHeader
          title={email}
          subtitle="Δεν υπάρχει άλλο διπλότυπο"
          actions={
            <LinkButton href="/admin/merge" variant="secondary" icon={ArrowLeft}>
              Πίσω
            </LinkButton>
          }
        />
        <Alert tone="success">
          Δεν βρέθηκαν πλέον διπλότυπες εγγραφές για αυτό το email.
        </Alert>
      </>
    );
  }

  // Enrich with counts (Prisma-side).
  const enriched = await Promise.all(
    candidates.map(async (u) => {
      const counts = await prisma.user.findUnique({
        where: { id: u.id },
        select: {
          _count: {
            select: {
              memberships: true,
              sessions: true,
            },
          },
        },
      });
      return { ...u, counts: counts?._count };
    }),
  );

  return (
    <>
      <PageHeader
        title={email}
        subtitle={`${candidates.length} διπλότυπες εγγραφές — επίλεξε winner`}
        actions={
          <LinkButton href="/admin/merge" variant="secondary" icon={ArrowLeft}>
            Πίσω
          </LinkButton>
        }
      />

      <Alert tone="warning">
        Ο winner κρατά τον λογαριασμό του. Οι υπόλοιποι διαγράφονται αφού
        μεταφερθούν όλες οι συμμετοχές (business memberships), sessions,
        notifications, audit history, OAuth accounts (με dedupe).
      </Alert>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {enriched.map((u) => (
          <Card key={u.id}>
            <CardHeader
              title={u.fullName || u.email}
              subtitle={
                <span>
                  Δημιουργήθηκε {u.createdAt.toLocaleDateString("el-GR")} · ID{" "}
                  {u.id.slice(-8)}
                </span>
              }
              action={
                <div className="flex items-center gap-2">
                  {u.platformRole && (
                    <Badge tone="warning">{u.platformRole}</Badge>
                  )}
                  {u.suspendedAt && <Badge tone="danger">SUSPENDED</Badge>}
                </div>
              }
            />
            <CardBody className="space-y-2 text-sm">
              <p>
                <strong>Email:</strong> <span className="mono">{u.email}</span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Stat label="Συμμετοχές" value={u.counts?.memberships ?? 0} />
                <Stat label="Sessions" value={u.counts?.sessions ?? 0} />
              </div>
              <p className="mt-3">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="text-xs font-bold text-brand-800 hover:text-brand-900"
                >
                  Δες πλήρη καρτέλα →
                </Link>
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="Εκτέλεση merge" />
        <CardBody>
          <MergeUserForm
            candidates={enriched.map((u) => ({
              id: u.id,
              label: `${u.fullName || u.email} · ${u.counts?.memberships ?? 0} memberships · ID ${u.id.slice(-8)}`,
            }))}
          />
        </CardBody>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p className="text-lg font-black tabular-nums text-brand-900">
        {value.toLocaleString("el-GR")}
      </p>
    </div>
  );
}
