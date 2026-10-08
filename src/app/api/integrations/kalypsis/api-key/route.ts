import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/api-keys";
import { forbidden, unauthorized } from "@/lib/integrations/kalypsis";

export async function POST(_request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!session.activeBusinessId) return forbidden("Δεν έχει επιλεγεί επιχείρηση.");
  const membership = await prisma.businessMember.findFirst({ where: { userId: session.userId, businessId: session.activeBusinessId }, select: { role: true } });
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) return forbidden();
  const generated = generateApiKey();
  await prisma.apiKey.create({
    data: {
      businessId: session.activeBusinessId,
      name: "Kalypsis — πάροχος ηλεκτρονικής τιμολόγησης",
      prefix: generated.prefix,
      keyHash: generated.keyHash,
      scopes: "integration:kalypsis",
      createdById: session.userId,
    },
  });
  return NextResponse.json({ ok: true, apiKey: generated.plaintext, warning: "Αποθηκεύστε το κλειδί τώρα. Δεν θα εμφανιστεί ξανά." }, { status: 201 });
}
