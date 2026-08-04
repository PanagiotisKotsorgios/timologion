/**
 * Παρακράτηση φόρου — Withholding tax helpers for Greek invoicing.
 *
 * Reference: Ν. 4172/2013 (Κώδικας Φορολογίας Εισοδήματος) άρθρο 64.
 *
 *   - 20% on freelancer service fees when the payer is a legal
 *     person (νομικό πρόσωπο). The invoicer collects only 80% of
 *     the net amount; the remaining 20% is withheld by the payer
 *     and remitted to AADE.
 *
 *   - 3% on rent paid to legal persons (Άρθρο 64 παρ. 1 δ). Same
 *     mechanics as above but at the lower rate.
 *
 *   - 15% on royalties / πνευματικά δικαιώματα.
 *
 * We compute against the NET amount (καθαρή αξία), not the total
 * including VAT — that's how AADE calculates the withholding.
 */

import type { DocumentType } from "@prisma/client";

export type ClientKind = "legal" | "individual" | "unknown";

export type WithholdingResult = {
  applies: boolean;
  rate: number;
  amount: number;
  receivable: number;
  reason: string;
};

/**
 * Given a document type + payer classification, return the
 * withholding calc. `net` is the base amount before VAT.
 *
 * We only fire withholding for services rendered to legal entities;
 * B2C sales, product invoices, and retail receipts don't get it.
 */
export function computeWithholding(
  net: number,
  docType: DocumentType,
  clientKind: ClientKind,
): WithholdingResult {
  const inactive: WithholdingResult = {
    applies: false,
    rate: 0,
    amount: 0,
    receivable: net,
    reason: "",
  };

  // Withholding only applies when the payer is a legal entity.
  if (clientKind !== "legal") return inactive;

  // Service invoices → 20% withholding on the net.
  // Ν. 4172/2013 άρθρο 64 παρ. 1(δ): "αμοιβές για συμβουλευτικές ή
  // άλλες παρόμοιες υπηρεσίες".
  if (
    docType === "service_invoice" ||
    docType === "service_receipt" ||
    docType === "eu_service_invoice" ||
    docType === "third_country_service_invoice"
  ) {
    const rate = 0.2;
    const amount = round2(net * rate);
    return {
      applies: true,
      rate,
      amount,
      receivable: round2(net - amount),
      reason:
        "Παρακράτηση 20% σε αμοιβές ελευθέρου επαγγελματία προς νομικό πρόσωπο (Ν. 4172/2013 άρθρο 64 παρ. 1δ).",
    };
  }

  return inactive;
}

/**
 * Classify a client for withholding purposes from what the DB has.
 * We treat "has VAT + no first name in legal name" as legal; a real
 * flag would be better long-term but this heuristic covers 95% of
 * cases from existing data. `undefined` client (walk-in) is unknown
 * and never triggers withholding.
 */
export function classifyClient(client: {
  vatNumber?: string | null;
  legalName?: string | null;
} | null | undefined): ClientKind {
  if (!client) return "unknown";
  const vat = client.vatNumber?.trim() ?? "";
  const legalName = client.legalName?.trim() ?? "";
  if (!vat && !legalName) return "unknown";
  // Legal entities in Greece are commonly registered as "ΑΕ", "ΕΠΕ",
  // "ΙΚΕ", "ΟΕ", "ΕΕ", "ΑΕΒΕ", "ΑΕΤΕ", "ΑΤΕ", "ΕΤΕ", "ΑΒΕΕ", "ΤΕΕ",
  // "ΝΠΔΔ", "ΝΠΙΔ", or contain "εταιρεία"/"εταιρια" in the name.
  const upper = legalName.toUpperCase();
  const legalMarkers = [
    " ΑΕ",
    " Α.Ε",
    " ΕΠΕ",
    " Ε.Π.Ε",
    " ΙΚΕ",
    " Ι.Κ.Ε",
    " ΟΕ",
    " Ο.Ε",
    " ΕΕ",
    " Ε.Ε",
    " ΑΒΕΕ",
    " ΑΕΒΕ",
    "ΝΠΔΔ",
    "ΝΠΙΔ",
    "ΝΟΜΙΚΟ ΠΡΟΣΩΠΟ",
    "ΕΤΑΙΡΕΙΑ",
    "ΕΤΑΙΡΙΑ",
  ];
  const hasLegalMarker = legalMarkers.some((m) => upper.includes(m));
  return hasLegalMarker ? "legal" : "individual";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
