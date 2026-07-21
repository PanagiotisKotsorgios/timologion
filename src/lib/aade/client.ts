import "server-only";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

// AADE / ΓΓΠΣ VAT lookup client.
//
// Public AADE reg2 SOAP endpoint:
//   https://www1.aade.gr/webservices2/wsPublicReg2/publicRegService.asmx
//
// This module returns real data when the current business has AADE credentials
// stored. Otherwise it falls through to a deterministic mock so the app can be
// demoed. The real SOAP integration is stubbed with a clear TODO — wire the
// request/response mapping when credentials are exchanged with production.

export type AadeResult = {
  vat: string;
  legal_name: string;
  trade_name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  activity: string | null;
  tax_office: string | null;
  country_code: "EL";
  source: "aade" | "mock";
};

export async function lookupVatViaBusiness(
  businessId: string,
  vat: string,
): Promise<AadeResult | null> {
  const cleaned = vat.replace(/\D/g, "");
  if (cleaned.length !== 9) return null;

  const b = await prisma.business.findUnique({
    where: { id: businessId },
    select: { aadeUsername: true, aadePasswordEnc: true },
  });

  if (b?.aadeUsername && b?.aadePasswordEnc) {
    const password = decryptSecret(b.aadePasswordEnc);
    if (password) {
      // TODO: Wire real AADE SOAP call using `aadeUsername` + `password` for
      // WS-Security. The response should be mapped into AadeResult with
      // source="aade" and returned here. Until then we fall through to mock
      // in dev but return null in production so callers can pick a fallback
      // (e.g. Wrapp's vat-search) instead of receiving fake data.
      // See scripts/aade-lookup-sample.md for the WS envelope layout.
    }
  }

  // Production safety: never fabricate business details. The mock is
  // dev-only so seed flows still work.
  if (process.env.NODE_ENV === "production") return null;
  return mockLookup(cleaned);
}

function mockLookup(vat: string): AadeResult {
  return {
    vat,
    legal_name: `Παράδειγμα Επιχείρηση ${vat.slice(-4)}`,
    trade_name: null,
    address: "Οδός Παραδείγματος 1",
    city: "Αθήνα",
    postal_code: "10000",
    activity: "Παροχή υπηρεσιών",
    tax_office: "ΔΟΥ Α' ΑΘΗΝΩΝ",
    country_code: "EL",
    source: "mock",
  };
}
