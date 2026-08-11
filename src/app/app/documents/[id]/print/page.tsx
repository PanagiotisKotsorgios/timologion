import { redirect } from "next/navigation";

/**
 * Print view is now a thin redirect to the /pdf route, which itself
 * redirects to the provider's (Wrapp's) official PDF. Constantinos'
 * production-readiness note:
 *
 *   > Τα PDF των παραστατικών τα παράγει η πλατφόρμα σου ή
 *   > χρησιμοποιείς αυτά που επιστρέφει το API μας;
 *
 * We now use theirs — always. The old locally-rendered HTML print
 * view was drifting from what myDATA has on file (missing QR, MARK
 * layout inconsistent with the provider's PDF, no bilingual variant).
 * Kept the /print URL as an alias so any bookmarks / row menus that
 * still point here degrade gracefully.
 */
export const dynamic = "force-dynamic";

export default async function PrintDocumentAlias({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/documents/${id}/pdf`);
}
