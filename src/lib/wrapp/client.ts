import "server-only";
import type {
  WrappInvoiceRequest,
  WrappInvoiceResponse,
  WrappTenantDetails,
  WrappVatSearchResult,
} from "./schemas";

/**
 * Phase 1 stub. All methods return canned data or throw NotImplementedInPhase1
 * for the write path. The interface matches what the real HTTP client in Phase
 * 2 will expose, so call sites do not change.
 */

export class NotImplementedInPhase1 extends Error {
  constructor(op: string) {
    super(
      `Η ενέργεια "${op}" απαιτεί ενεργό σύνδεση Wrapp. Θα ενεργοποιηθεί σε επόμενη φάση.`,
    );
    this.name = "NotImplementedInPhase1";
  }
}

export interface WrappClient {
  getTenantDetails(businessId: string): Promise<WrappTenantDetails>;
  vatSearch(vat: string): Promise<WrappVatSearchResult | null>;
  issueInvoice(
    businessId: string,
    payload: WrappInvoiceRequest,
  ): Promise<WrappInvoiceResponse>;
}

class StubWrappClient implements WrappClient {
  async getTenantDetails(_businessId: string): Promise<WrappTenantDetails> {
    return {
      wrapp_user_id: "stub-user",
      has_plan: false,
      issue_invoice_status: false,
      plan_name: null,
    };
  }

  async vatSearch(vat: string): Promise<WrappVatSearchResult | null> {
    // Deterministic mock: returns something for well-formed 9-digit Greek AFMs.
    const trimmed = vat.replace(/\D/g, "");
    if (trimmed.length !== 9) return null;
    return {
      vat: trimmed,
      legal_name: `Παράδειγμα Επιχείρηση ${trimmed.slice(-4)}`,
      trade_name: null,
      address: "Οδός Παραδείγματος 1",
      city: "Αθήνα",
      postal_code: "10000",
      activity: "Παροχή υπηρεσιών",
      tax_office: "ΔΟΥ Α' ΑΘΗΝΩΝ",
      country_code: "EL",
    };
  }

  async issueInvoice(
    _businessId: string,
    _payload: WrappInvoiceRequest,
  ): Promise<WrappInvoiceResponse> {
    throw new NotImplementedInPhase1("Έκδοση παραστατικού μέσω Wrapp");
  }
}

let cached: WrappClient | null = null;

export function getWrappClient(): WrappClient {
  if (cached) return cached;
  // Lazy import to avoid pulling the http client into every code path.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./http-client") as {
      tryBuildHttpWrappClient: () => WrappClient | null;
    };
    const http = mod.tryBuildHttpWrappClient();
    if (http) {
      cached = http;
      return cached;
    }
  } catch {
    // Fall through to stub.
  }
  cached = new StubWrappClient();
  return cached;
}
