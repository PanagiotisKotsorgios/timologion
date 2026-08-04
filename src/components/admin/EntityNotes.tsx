import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EntityNoteForm, EntityNoteRow } from "./EntityNoteClient";

/**
 * Server component that fetches recent notes for the given
 * (entityType, entityId) tuple and delegates rendering to the client
 * companion. Meant to slot into any admin detail page — user, document,
 * ticket, etc.
 */
export async function EntityNotes({
  entityType,
  entityId,
  title = "Σημειώσεις",
}: {
  entityType: string;
  entityId: string;
  title?: string;
}) {
  await requireAdmin("super_admin", "support");

  const [rows, authors] = await Promise.all([
    prisma.entityNote.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.findMany({
      where: { platformRole: { not: null } },
      select: { id: true, email: true, fullName: true },
    }),
  ]);
  const authorMap = new Map(
    authors.map((a) => [a.id, a.fullName || a.email]),
  );

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle="Μόνο εσωτερικά — ο πελάτης δεν βλέπει τίποτα."
      />
      <CardBody className="space-y-4">
        <EntityNoteForm entityType={entityType} entityId={entityId} />
        {rows.length === 0 ? (
          <p className="text-sm text-ink-500">Καμία σημείωση ακόμη.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((n) => (
              <EntityNoteRow
                key={n.id}
                id={n.id}
                body={n.body}
                author={authorMap.get(n.authorId) ?? n.authorId.slice(-6)}
                createdAt={n.createdAt.toISOString()}
                entityType={entityType}
                entityId={entityId}
              />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
