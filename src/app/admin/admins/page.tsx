import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { date } from "@/lib/format";
import { PromoteForm } from "./PromoteForm";
import { demoteAdminAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminAdminsPage() {
  const ctx = await requireAdmin("super_admin");

  const admins = await prisma.user.findMany({
    where: { platformRole: { not: null } },
    orderBy: [{ platformRole: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      fullName: true,
      platformRole: true,
      createdAt: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Platform admins"
        subtitle="Διαχείριση προσωπικού πλατφόρμας. Μόνο super_admin έχει πρόσβαση εδώ."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader
            title={`Μέλη (${admins.length})`}
            subtitle="Ο τελευταίος super_admin δεν μπορεί να αφαιρεθεί."
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">Όνομα</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Ρόλος</th>
                  <th className="px-4 py-2 text-left">Ημ/νία</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {admins.map((a) => {
                  const isSelf = a.id === ctx.userId;
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-2 font-medium">
                        <Link
                          href={`/admin/users/${a.id}`}
                          className="text-brand-700 hover:text-brand-800"
                        >
                          {a.fullName || "—"}
                        </Link>
                        {isSelf && (
                          <span className="ml-2 text-xs text-ink-500">
                            (εσύ)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-ink-700">{a.email}</td>
                      <td className="px-4 py-2">
                        <Badge tone="warning">{a.platformRole}</Badge>
                      </td>
                      <td className="px-4 py-2 text-ink-500">
                        {date(a.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {!isSelf && (
                          <form action={demoteAdminAction}>
                            <input type="hidden" name="userId" value={a.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                            >
                              Αφαίρεση
                            </Button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Ανάθεση ρόλου"
            subtitle="Ο χρήστης πρέπει να έχει ήδη εγγραφεί."
          />
          <CardBody>
            <PromoteForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
