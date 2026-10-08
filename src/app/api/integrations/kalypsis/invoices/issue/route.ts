import { NextRequest, NextResponse } from "next/server";
import { requireKalypsisApiKey, unauthorized, productionIssueEnabled } from "@/lib/integrations/kalypsis";
import { attemptIssueForBusiness } from "@/app/app/documents/actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Explicitly separated from preview/draft. The two independent guards are
 * intentional: a UI bug or an automated test can never transmit to Wrapp or
 * myDATA unless the deployment operator enables production issuance AND the
 * caller sends the confirmation header. */
export async function POST(request: NextRequest) {
  const auth = await requireKalypsisApiKey(request);
  if (!auth) return unauthorized();
  if (!productionIssueEnabled()) {
    return NextResponse.json({ ok: false, production: false, error: "Η έκδοση παραγωγής είναι απενεργοποιημένη για την ασφάλεια των δοκιμών." }, { status: 409 });
  }
  if (request.headers.get("x-kalypsis-production-confirm") !== "issue-production") {
    return NextResponse.json({ ok: false, production: false, error: "Απαιτείται ρητή επιβεβαίωση έκδοσης παραγωγής." }, { status: 428 });
  }
  const body = await request.json().catch(() => null) as { documentId?: string } | null;
  if (!body?.documentId) return NextResponse.json({ ok: false, error: "Λείπει το αναγνωριστικό παραστατικού." }, { status: 400 });
  const doc = await prisma.document.findFirst({ where: { id: body.documentId, businessId: auth.businessId }, select: { id: true } });
  if (!doc) return NextResponse.json({ ok: false, error: "Το παραστατικό δεν βρέθηκε." }, { status: 404 });
  const result = await attemptIssueForBusiness(auth.businessId, null, doc.id);
  return NextResponse.json({ ...result, production: true }, { status: result.ok ? 200 : 422 });
}
