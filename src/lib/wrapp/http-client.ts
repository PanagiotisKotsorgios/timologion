import "server-only";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { decryptSecret } from "@/lib/crypto";
import {
  wrappLoginRequest,
  wrappLoginResponse,
  wrappTenantDetails,
  wrappVatSearchResult,
  wrappInvoiceRequest,
  wrappInvoiceResponse,
  type WrappInvoiceRequest,
  type WrappInvoiceResponse,
  type WrappTenantDetails,
  type WrappVatSearchResult,
} from "./schemas";
import type { WrappClient } from "./client";
import { NotImplementedInPhase1 } from "./client";

/**
 * Real HTTP-backed Wrapp client. Falls back to `NotImplementedInPhase1` when
 * the platform hasn't provided partner credentials yet.
 *
 * Base URL comes from `WRAPP_API_BASE_URL` (env). Per-business credentials
 * live on `WrappConnection.encryptedApiKey`; the shared partner API key comes
 * from `WRAPP_API_KEY`. JWT is cached in `WrappConnection` (24h).
 */
export class HttpWrappClient implements WrappClient {
  private base: string;
  private partnerKey: string;

  constructor(base: string, partnerKey: string) {
    this.base = base.replace(/\/$/, "");
    this.partnerKey = partnerKey;
  }

  private async ensureJwt(businessId: string): Promise<string> {
    const conn = await prisma.wrappConnection.findUnique({
      where: { businessId },
    });
    if (!conn) throw new Error("Δεν υπάρχει σύνδεση Wrapp για την επιχείρηση.");

    if (
      conn.jwtExpiresAt &&
      conn.jwtExpiresAt.getTime() - Date.now() > 5 * 60 * 1000 &&
      conn.wrappUserId
    ) {
      // JWT valid for >5min; but we don't store it plaintext (only expiry).
      // The stored encryptedApiKey doubles as JWT cache after first login.
      const cached = conn.encryptedApiKey
        ? decryptSecret(conn.encryptedApiKey)
        : null;
      if (cached) return cached;
    }

    // Login
    const payload = wrappLoginRequest.parse({
      partner_api_key: this.partnerKey,
      wrapp_user_id: conn.wrappUserId ?? undefined,
    });
    const res = await fetch(`${this.base}/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Wrapp login ${res.status}: ${body.slice(0, 200)}`);
    }
    const parsed = wrappLoginResponse.parse(await res.json());
    // Persist JWT expiry for later cache checks.
    await prisma.wrappConnection.update({
      where: { businessId },
      data: {
        jwtExpiresAt: new Date(parsed.expires_at),
        lastVerifiedAt: new Date(),
      },
    });
    return parsed.jwt;
  }

  private async request<T>(
    businessId: string,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const jwt = await this.ensureJwt(businessId);
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${jwt}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Wrapp ${method} ${path} ${res.status}: ${text.slice(0, 240)}`,
      );
    }
    return (await res.json()) as T;
  }

  async getTenantDetails(businessId: string): Promise<WrappTenantDetails> {
    const json = await this.request<unknown>(
      businessId,
      "GET",
      "/tenant_details",
    );
    return wrappTenantDetails.parse(json);
  }

  async vatSearch(vat: string): Promise<WrappVatSearchResult | null> {
    // vatSearch doesn't need JWT — uses partner key directly.
    const url = `${this.base}/vat_search?vat=${encodeURIComponent(vat)}&country_code=EL`;
    const res = await fetch(url, {
      headers: {
        "api-key": this.partnerKey,
        accept: "application/json",
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    try {
      return wrappVatSearchResult.parse(await res.json());
    } catch {
      return null;
    }
  }

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
}

/**
 * Factory: returns the HTTP client when the partner API key is configured,
 * otherwise throws NotImplementedInPhase1 lazily from each method (so callers
 * keep the same interface).
 */
export function tryBuildHttpWrappClient(): WrappClient | null {
  const key = env.WRAPP_API_KEY;
  if (!key || key.length < 10) return null;
  return new HttpWrappClient(env.WRAPP_API_BASE_URL, key);
}

export { NotImplementedInPhase1 };
