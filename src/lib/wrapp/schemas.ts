import { z } from "zod";

// Typed schemas for the Wrapp API surface we care about in Phase 1.
// These mirror the shape from https://wrapp.ai/api/documentation but are not
// exhaustive. Phase 1 uses them only to type the stub client so that Phase 2
// can wire real HTTP calls without changing call sites.

export const wrappLoginRequest = z.object({
  partner_api_key: z.string(),
  email: z.string().email().optional(),
  wrapp_user_id: z.string().optional(),
});
export type WrappLoginRequest = z.infer<typeof wrappLoginRequest>;

export const wrappLoginResponse = z.object({
  jwt: z.string(),
  expires_at: z.string(), // ISO
});
export type WrappLoginResponse = z.infer<typeof wrappLoginResponse>;

export const wrappTenantDetails = z.object({
  wrapp_user_id: z.string(),
  has_plan: z.boolean(),
  issue_invoice_status: z.boolean(),
  plan_name: z.string().nullable().optional(),
});
export type WrappTenantDetails = z.infer<typeof wrappTenantDetails>;

export const wrappVatSearchResult = z.object({
  vat: z.string(),
  legal_name: z.string(),
  trade_name: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  activity: z.string().nullable().optional(),
  tax_office: z.string().nullable().optional(),
  country_code: z.string().default("EL"),
});
export type WrappVatSearchResult = z.infer<typeof wrappVatSearchResult>;

export const wrappInvoiceLine = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  vat_rate: z.number(),
  discount_pct: z.number().optional(),
});

export const wrappInvoiceRequest = z.object({
  type: z.string(),
  series: z.string(),
  client: z.object({
    vat: z.string().optional(),
    legal_name: z.string(),
    country_code: z.string().default("EL"),
    address: z.string().optional(),
  }),
  lines: z.array(wrappInvoiceLine).min(1),
  issue_date: z.string(),
  idempotency_key: z.string(),
});
export type WrappInvoiceRequest = z.infer<typeof wrappInvoiceRequest>;

export const wrappInvoiceResponse = z.object({
  invoice_id: z.string(),
  status: z.enum(["issued", "failed", "pending"]),
  my_data_mark: z.string().nullable().optional(),
  my_data_uid: z.string().nullable().optional(),
  my_data_qr_url: z.string().nullable().optional(),
  invoice_url: z.string().nullable().optional(),
  invoice_url_en: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});
export type WrappInvoiceResponse = z.infer<typeof wrappInvoiceResponse>;
