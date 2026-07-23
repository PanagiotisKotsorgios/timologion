import "server-only";
import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { getWrappSettings } from "./settings";
import {
  wrappLoginResponse,
  wrappTenantDetails,
  wrappVatSearchRaw,
  wrappBranchesResponse,
  wrappBranch,
  wrappBillingBooksResponse,
  wrappBillingBook,
  wrappInvoiceRequest,
  wrappInvoiceResponse,
  wrappPdfImmediate,
  wrappPdfQueued,
  wrappCateringTable,
  wrappPosDevice,
  type WrappVatSearchResult,
  type WrappTenantDetails,
  type WrappBranch,
  type WrappBillingBook,
  type WrappInvoiceRequest,
  type WrappInvoiceResponse,
  type WrappCateringTable,
  type WrappPosDevice,
} from "./schemas";

export class WrappApiError extends Error {
  code: string;
  httpStatus: number;
  raw: unknown;
  constructor(
    message: string,
    opts: { code?: string; httpStatus?: number; raw?: unknown } = {},
  ) {
    super(message);
    this.name = "WrappApiError";
    this.code = opts.code ?? "wrapp.error";
    this.httpStatus = opts.httpStatus ?? 0;
    this.raw = opts.raw;
  }
}

export class NotImplementedInPhase1 extends WrappApiError {
  constructor(op: string) {
    super(
      `Η ενέργεια "${op}" απαιτεί ενεργό σύνδεση Wrapp. Ολοκλήρωσε την ενεργοποίηση από τις Ρυθμίσεις.`,
      { code: "wrapp.not_configured" },
    );
    this.name = "NotImplementedInPhase1";
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

type TenantCreds = { apiKey: string; email: string };

async function resolveTenantCreds(businessId: string): Promise<TenantCreds | null> {
  const conn = await prisma.wrappConnection.findUnique({
    where: { businessId },
  });

  const storedKey = conn?.encryptedApiKey
    ? decryptSecret(conn.encryptedApiKey)
    : null;
  if (storedKey && conn?.wrappEmail) {
    return { apiKey: storedKey, email: conn.wrappEmail };
  }

  // Staging fallback: if the Business hasn't onboarded to Wrapp yet, allow
  // testing against the shared staging tenant so the full flow works
  // end-to-end without going through external_login. Values come from
  // AppSetting first (admin UI), then env vars.
  const settings = await getWrappSettings();
  if (settings.stagingTenantApiKey && settings.stagingTenantEmail) {
    return {
      apiKey: settings.stagingTenantApiKey,
      email: settings.stagingTenantEmail,
    };
  }
  return null;
}

export class HttpWrappClient {
  // Base URL is resolved per-request from AppSetting so admin edits take
  // effect immediately without restarting the process.
  private async resolveBase(): Promise<string> {
    const settings = await getWrappSettings();
    return settings.baseUrl.replace(/\/$/, "");
  }

  private async login(creds: TenantCreds): Promise<string> {
    const base = await this.resolveBase();
    const res = await fetchWithTimeout(`${base}/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        email: creds.email,
        api_key: creds.apiKey,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new WrappApiError(`Wrapp login failed: ${text.slice(0, 200)}`, {
        code: "wrapp.login_failed",
        httpStatus: res.status,
        raw: text,
      });
    }
    const parsed = wrappLoginResponse.parse(await res.json());
    return parsed.data.attributes.jwt;
  }

  private async ensureJwt(businessId: string): Promise<string> {
    const conn = await prisma.wrappConnection.findUnique({
      where: { businessId },
    });

    const cachedJwt = conn?.encryptedJwt ? decryptSecret(conn.encryptedJwt) : null;
    const buffer = 5 * 60 * 1000;
    if (
      cachedJwt &&
      conn?.jwtExpiresAt &&
      conn.jwtExpiresAt.getTime() - Date.now() > buffer
    ) {
      return cachedJwt;
    }

    const creds = await resolveTenantCreds(businessId);
    if (!creds) throw new NotImplementedInPhase1("Login");

    const jwt = await this.login(creds);
    const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000);
    await prisma.wrappConnection.upsert({
      where: { businessId },
      create: {
        businessId,
        status: "active",
        wrappEmail: creds.email,
        encryptedApiKey: encryptSecret(creds.apiKey),
        encryptedJwt: encryptSecret(jwt),
        jwtExpiresAt: expiresAt,
        lastVerifiedAt: new Date(),
        hasPlan: true,
        canIssueInvoice: true,
      },
      update: {
        status: "active",
        wrappEmail: creds.email,
        encryptedApiKey: encryptSecret(creds.apiKey),
        encryptedJwt: encryptSecret(jwt),
        jwtExpiresAt: expiresAt,
        lastVerifiedAt: new Date(),
      },
    });
    return jwt;
  }

  private async invalidateJwt(businessId: string): Promise<void> {
    await prisma.wrappConnection
      .update({
        where: { businessId },
        data: { encryptedJwt: null, jwtExpiresAt: null },
      })
      .catch(() => undefined);
  }

  private async request<T>(
    businessId: string,
    method: string,
    path: string,
    body?: unknown,
    retriedAfter401 = false,
  ): Promise<T> {
    const jwt = await this.ensureJwt(businessId);
    const base = await this.resolveBase();
    let res: Response;
    try {
      res = await fetchWithTimeout(`${base}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${jwt}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      logger.error("wrapp.network_error", err, { businessId, action: method + " " + path });
      throw new WrappApiError(
        "Αποτυχία επικοινωνίας με τη Wrapp. Δοκίμασε ξανά σε λίγο.",
        { code: "wrapp.network_error" },
      );
    }

    if (res.status === 401 && !retriedAfter401) {
      await this.invalidateJwt(businessId);
      return this.request<T>(businessId, method, path, body, true);
    }

    const text = await res.text();
    if (!res.ok) {
      logger.warn("wrapp.http_error", {
        businessId,
        action: method + " " + path,
        status: String(res.status),
        body: text.slice(0, 500),
      });
      throw new WrappApiError(
        `Η Wrapp επέστρεψε σφάλμα (${res.status}): ${text.slice(0, 240)}`,
        { code: "wrapp.http_error", httpStatus: res.status, raw: text },
      );
    }

    if (text.length === 0) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new WrappApiError("Μη έγκυρη απάντηση Wrapp (parse error).", {
        code: "wrapp.parse_error",
        raw: text,
      });
    }
  }

  // ─── Public endpoints ─────────────────────────────────────────────────

  async getTenantDetails(businessId: string): Promise<WrappTenantDetails> {
    const json = await this.request<unknown>(businessId, "GET", "/tenant_details");
    return wrappTenantDetails.parse(json);
  }

  async vatSearch(businessId: string, vat: string): Promise<WrappVatSearchResult | null> {
    const cleaned = vat.replace(/\D/g, "");
    if (cleaned.length !== 9) return null;
    try {
      const json = await this.request<unknown>(
        businessId,
        "GET",
        `/vat_search?vat=${cleaned}&country_code=EL`,
      );
      const parsed = wrappVatSearchRaw.parse(json);
      const streetAndNumber = [parsed.address, parsed.street_number]
        .filter(Boolean)
        .join(" ");
      return {
        vat: parsed.vat_no,
        legal_name: parsed.name,
        trade_name: null,
        address: streetAndNumber || null,
        city: parsed.city ?? null,
        postal_code: parsed.postal_code ?? null,
        activity: null,
        tax_office: null,
        country_code: "EL",
      };
    } catch (err) {
      if (err instanceof WrappApiError && err.httpStatus === 404) return null;
      throw err;
    }
  }

  async listVatExemptions(businessId: string): Promise<Record<string, string>[]> {
    const json = await this.request<unknown>(businessId, "GET", "/vat_exemptions");
    return Array.isArray(json) ? (json as Record<string, string>[]) : [];
  }

  // ─── Branches ─────────────────────────────────────────────────────────

  async listBranches(businessId: string): Promise<WrappBranch[]> {
    const json = await this.request<unknown>(businessId, "GET", "/branches");
    return wrappBranchesResponse.parse(json);
  }

  async createBranch(
    businessId: string,
    payload: {
      name: string;
      code: number;
      address: string;
      street_number: string;
      city: string;
      postal_code: string;
      phone?: string;
      default_option?: boolean;
    },
  ): Promise<WrappBranch> {
    const json = await this.request<unknown>(
      businessId,
      "POST",
      "/branches",
      payload,
    );
    return wrappBranch.parse(json);
  }

  // ─── Billing books ────────────────────────────────────────────────────

  async listBillingBooks(businessId: string): Promise<WrappBillingBook[]> {
    const json = await this.request<unknown>(businessId, "GET", "/billing_books");
    return wrappBillingBooksResponse.parse(json);
  }

  async createBillingBook(
    businessId: string,
    payload: {
      name: string;
      series: string;
      number: number;
      invoice_type_code: string;
    },
  ): Promise<WrappBillingBook> {
    const json = await this.request<unknown>(
      businessId,
      "POST",
      "/billing_books",
      payload,
    );
    return wrappBillingBook.parse(json);
  }

  // ─── Invoices ─────────────────────────────────────────────────────────

  async issueInvoice(
    businessId: string,
    payload: WrappInvoiceRequest,
  ): Promise<WrappInvoiceResponse> {
    const validated = wrappInvoiceRequest.parse(payload);
    const json = await this.request<unknown>(
      businessId,
      "POST",
      "/invoices",
      validated,
    );
    return wrappInvoiceResponse.parse(json);
  }

  async getInvoiceStatus(
    businessId: string,
    wrappInvoiceId: string,
  ): Promise<WrappInvoiceResponse> {
    const json = await this.request<unknown>(
      businessId,
      "GET",
      `/invoices/${encodeURIComponent(wrappInvoiceId)}`,
    );
    return wrappInvoiceResponse.parse(json);
  }

  /** Cancel a delivery-note invoice (9.3). Other types cannot be cancelled. */
  async cancelInvoice(
    businessId: string,
    wrappInvoiceId: string,
  ): Promise<WrappInvoiceResponse> {
    const json = await this.request<unknown>(
      businessId,
      "DELETE",
      `/invoices/${encodeURIComponent(wrappInvoiceId)}/cancel`,
    );
    return wrappInvoiceResponse.parse(json);
  }

  async deleteDraft(businessId: string, wrappInvoiceId: string): Promise<void> {
    await this.request<unknown>(
      businessId,
      "DELETE",
      `/invoices/${encodeURIComponent(wrappInvoiceId)}/delete_draft`,
    );
  }

  async issueDraft(
    businessId: string,
    wrappInvoiceId: string,
    payload: { generate_pdf?: boolean; email_locale?: "el" | "en" } = {},
  ): Promise<WrappInvoiceResponse> {
    const json = await this.request<unknown>(
      businessId,
      "POST",
      `/invoices/${encodeURIComponent(wrappInvoiceId)}/issue_draft`,
      payload,
    );
    return wrappInvoiceResponse.parse(json);
  }

  async markAsPaid(businessId: string, wrappInvoiceId: string): Promise<void> {
    await this.request<unknown>(
      businessId,
      "GET",
      `/invoices/${encodeURIComponent(wrappInvoiceId)}/mark_as_paid`,
    );
  }

  async generatePdf(
    businessId: string,
    wrappInvoiceId: string,
    locale: "el" | "en" = "el",
  ): Promise<{ download_url?: string; queued?: boolean }> {
    const json = await this.request<unknown>(
      businessId,
      "GET",
      `/invoices/${encodeURIComponent(wrappInvoiceId)}/generate_pdf?locale=${locale}`,
    );
    const asObj = json as Record<string, unknown>;
    if (typeof asObj.download_url === "string") {
      return { download_url: wrappPdfImmediate.parse(asObj).download_url };
    }
    wrappPdfQueued.parse(asObj);
    return { queued: true };
  }

  async generateThermalPdf(
    businessId: string,
    wrappInvoiceId: string,
  ): Promise<{ download_url?: string; queued?: boolean }> {
    const json = await this.request<unknown>(
      businessId,
      "GET",
      `/invoices/${encodeURIComponent(wrappInvoiceId)}/generate_thermal_pdf`,
    );
    const asObj = json as Record<string, unknown>;
    if (typeof asObj.download_url === "string") {
      return { download_url: wrappPdfImmediate.parse(asObj).download_url };
    }
    wrappPdfQueued.parse(asObj);
    return { queued: true };
  }

  async issuedCount(businessId: string): Promise<number> {
    const json = await this.request<{ issued_count?: number }>(
      businessId,
      "GET",
      "/invoices/issued_count",
    );
    return json?.issued_count ?? 0;
  }

  // ─── Catering tables ──────────────────────────────────────────────────

  async listCateringTables(businessId: string): Promise<WrappCateringTable[]> {
    const json = await this.request<unknown>(businessId, "GET", "/catering_tables");
    return (Array.isArray(json) ? json : []).map((x) => wrappCateringTable.parse(x));
  }

  async createCateringTable(
    businessId: string,
    name: string,
  ): Promise<WrappCateringTable> {
    const json = await this.request<unknown>(
      businessId,
      "POST",
      "/catering_tables",
      { name },
    );
    return wrappCateringTable.parse(json);
  }

  async openCateringTable(
    businessId: string,
    { id, name }: { id?: string; name?: string },
  ): Promise<WrappCateringTable> {
    const json = await this.request<unknown>(
      businessId,
      "POST",
      "/catering_tables/open_table",
      id ? { id } : { name },
    );
    return wrappCateringTable.parse(json);
  }

  async closeCateringTable(
    businessId: string,
    id: string,
  ): Promise<WrappCateringTable> {
    const json = await this.request<unknown>(
      businessId,
      "POST",
      `/catering_tables/${encodeURIComponent(id)}/close`,
    );
    return wrappCateringTable.parse(json);
  }

  // ─── POS devices ──────────────────────────────────────────────────────

  async listPosDevices(businessId: string): Promise<WrappPosDevice[]> {
    const json = await this.request<unknown>(businessId, "GET", "/pos_devices");
    return (Array.isArray(json) ? json : []).map((x) => wrappPosDevice.parse(x));
  }
}

// ─── Partner API client (external onboarding) ─────────────────────────────

export class WrappPartnerClient {
  private base: string;
  private partnerKey: string;

  constructor(base: string, partnerKey: string) {
    this.base = base.replace(/\/$/, "");
    this.partnerKey = partnerKey;
  }

  private headers() {
    return {
      "content-type": "application/json",
      accept: "application/json",
      "X-PARTNER-API-KEY": this.partnerKey,
    };
  }

  async externalLogin(payload: {
    email: string;
    phone: string;
    partner_user_id?: string;
    return_url?: string;
    name?: string;
    vat?: string;
  }): Promise<{ login_url: string }> {
    const res = await fetchWithTimeout(`${this.base}/external_login`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new WrappApiError(
        `Partner external_login failed: ${text.slice(0, 200)}`,
        {
          code: "wrapp.partner.external_login_failed",
          httpStatus: res.status,
        },
      );
    }
    return (await res.json()) as { login_url: string };
  }

  async embeddedCheckUser(
    email: string,
  ): Promise<{ exists: boolean } & Record<string, unknown>> {
    const res = await fetchWithTimeout(
      `${this.base}/embedded_check_user?email=${encodeURIComponent(email)}`,
      { method: "GET", headers: this.headers() },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new WrappApiError(
        `Partner embedded_check_user failed: ${text.slice(0, 200)}`,
        {
          code: "wrapp.partner.check_user_failed",
          httpStatus: res.status,
        },
      );
    }
    return (await res.json()) as { exists: boolean } & Record<string, unknown>;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────
// No caching — settings can change at runtime (admin edits base URL / keys).
// Both clients read the current AppSetting values on each construction; the
// clients themselves hold no per-request state, so this is cheap.

export function getWrappClient(): HttpWrappClient {
  return new HttpWrappClient();
}

/**
 * Get a partner client from the current AppSetting-backed configuration.
 * Returns null when no partner API key is configured (in AppSetting or env).
 */
export async function getWrappPartnerClient(): Promise<WrappPartnerClient | null> {
  const settings = await getWrappSettings();
  if (!settings.partnerApiKey) return null;
  return new WrappPartnerClient(settings.baseUrl, settings.partnerApiKey);
}

/** Whether the current process has partner credentials at all. */
export async function hasPartnerCredentials(): Promise<boolean> {
  const settings = await getWrappSettings();
  return Boolean(settings.partnerApiKey);
}
