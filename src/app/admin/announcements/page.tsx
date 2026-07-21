import Link from "next/link";
import { Plus, Pencil, Trash2, Send, EyeOff } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton, Button } from "@/components/ui/Button";
import { date } from "@/lib/format";
import {
  deleteAnnouncementAction,
  togglePublishAction,
} from "./actions";

export const dynamic = "force-dynamic";

const TONE_LABEL: Record<string, string> = {
  info: "Ενημέρωση",
  warning: "Προσοχή",
  success: "Επιτυχία",
};
const TONE_TONE: Record<string, "brand" | "warning" | "success"> = {
  info: "brand",
  warning: "warning",
  success: "success",
};

export default async function AdminAnnouncementsPage() {
  await requireAdmin("super_admin", "support");

  const rows = await prisma.platformAnnouncement.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { fullName: true, email: true } } },
  });

  return (
    <>
      <PageHeader
        title="Ανακοινώσεις πλατφόρμας"
        subtitle="Μαζικές ανακοινώσεις που εμφανίζονται σε όλους τους χρήστες μέσω του καμπανακιού."
        actions={
          <LinkButton href="/admin/announcements/new" icon={Plus}>
            Νέα ανακοίνωση
          </LinkButton>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <CardBody className="p-14 text-center">
            <p className="text-lg font-semibold text-ink-900">
              Δεν υπάρχουν ανακοινώσεις.
            </p>
            <p className="mt-1 text-sm text-ink-700">
              Δημιούργησε την πρώτη ανακοίνωση για να την δουν οι χρήστες.
            </p>
            <div className="mt-6">
              <LinkButton href="/admin/announcements/new" icon={Plus}>
                Νέα ανακοίνωση
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Τίτλος</th>
                  <th>Τύπος</th>
                  <th>Δημοσίευση</th>
                  <th>Συντάκτης</th>
                  <th className="text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link
                        href={`/admin/announcements/${a.id}`}
                        className="font-semibold text-brand-800 hover:text-brand-900"
                      >
                        {a.title}
                      </Link>
                      <div className="text-xs text-ink-500">
                        Δημιουργήθηκε {date(a.createdAt)}
                      </div>
                    </td>
                    <td>
                      <Badge tone={TONE_TONE[a.tone] ?? "brand"}>
                        {TONE_LABEL[a.tone] ?? a.tone}
                      </Badge>
                    </td>
                    <td>
                      {a.publishedAt ? (
                        <Badge tone="success">
                          Δημοσιευμένη · {date(a.publishedAt)}
                        </Badge>
                      ) : (
                        <Badge tone="muted">Πρόχειρη</Badge>
                      )}
                    </td>
                    <td className="text-ink-700">
                      {a.author?.fullName ?? a.author?.email ?? "—"}
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <LinkButton
                          href={`/admin/announcements/${a.id}`}
                          variant="secondary"
                          size="sm"
                          icon={Pencil}
                        >
                          Επεξεργασία
                        </LinkButton>
                        <form action={togglePublishAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            icon={a.publishedAt ? EyeOff : Send}
                          >
                            {a.publishedAt ? "Απόσυρση" : "Δημοσίευση"}
                          </Button>
                        </form>
                        <form action={deleteAnnouncementAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                          >
                            Διαγραφή
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
