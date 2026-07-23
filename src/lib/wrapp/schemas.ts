import { z } from "zod";

/**
 * Zod schemas mirroring Wrapp's REST API surface as documented at
 * https://wrapp.ai/api/documentation.md
 *
 * Field naming follows Wrapp's snake_case exactly so schemas can `.parse()`
 * raw responses. Where the API uses optional/nullable fields we prefer
 * `.nullish()` so both `null` and `undefined` are accepted.
 */

// ─── Login ────────────────────────────────────────────────────────────────

export const wrappLoginResponse = z.object({
  data: z.object({
    type: z.literal("jwt"),
    attributes: z.object({
      jwt: z.string(),
    }),
  }),
});
export type WrappLoginResponse = z.infer<typeof wrappLoginResponse>;

// ─── Tenant / user details ────────────────────────────────────────────────

export const wrappTenantDetails = z.object({
  wrapp_user_id: z.string(),
  partner_user_id: z.string().nullish(),
  issue_invoice_status: z.boolean(),
  email: z.string().nullish(),
  has_plan: z.boolean(),
});
export type WrappTenantDetails = z.infer<typeof wrappTenantDetails>;

// ─── VAT search ───────────────────────────────────────────────────────────

export const wrappVatSearchRaw = z.object({
  vat_no: z.string(),
  name: z.string(),
  city: z.string().nullish(),
  address: z.string().nullish(),
  postal_code: z.string().nullish(),
  street_number: z.string().nullish(),
});
export type WrappVatSearchRaw = z.infer<typeof wrappVatSearchRaw>;

// Normalised shape used by our app.
export type WrappVatSearchResult = {
  vat: string;
  legal_name: string;
  trade_name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  activity: string | null;
  tax_office: string | null;
  country_code: "EL";
};

// ─── Branches ─────────────────────────────────────────────────────────────

export const wrappBranch = z.object({
  id: z.string(),
  name: z.string(),
  code: z.union([z.string(), z.number()]),
});
export type WrappBranch = z.infer<typeof wrappBranch>;

export const wrappBranchesResponse = z.array(wrappBranch);

// ─── Billing books ────────────────────────────────────────────────────────

export const wrappBillingBook = z.object({
  id: z.string(),
  name: z.string(),
  series: z.string(),
  invoice_type_code: z.string(),
  number: z.number().nullish(),
});
export type WrappBillingBook = z.infer<typeof wrappBillingBook>;

export const wrappBillingBooksResponse = z.array(wrappBillingBook);

// ─── Invoices ─────────────────────────────────────────────────────────────

export const wrappInvoiceCounterpart = z.object({
  name: z.string(),
  country_code: z.string().optional(),
  vat: z.string().optional(),
  city: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  postal_code: z.string().optional(),
  email: z.string().optional(),
});

export const wrappInvoiceLine = z.object({
  line_number: z.number(),
  name: z.string(),
  code: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number(),
  quantity_type: z.number().optional(),
  unit_price: z.number(),
  net_total_price: z.number(),
  vat_rate: z.number(),
  vat_total: z.number(),
  subtotal: z.number(),
  vat_exemption_code: z.union([z.number(), z.string()]).optional(),
  classification_category: z.string(),
  classification_type: z.string().optional(),
});
export type WrappInvoiceLine = z.infer<typeof wrappInvoiceLine>;

export const wrappDeliveryDetail = z.object({
  dispatch_date: z.string(),
  dispatch_time: z.string(),
  vehicle_number: z.string(),
  purpose_of_movement: z.string(),
  purpose_of_movement_custom_title: z.string().optional(),
  issuer_of_movement: z.string(),
  from_address: z.string(),
  from_number: z.string(),
  from_city: z.string(),
  from_zipcode: z.string(),
  from_branch: z.union([z.number(), z.string()]).optional(),
  to_address: z.string(),
  to_number: z.string(),
  to_city: z.string(),
  to_zipcode: z.string(),
  to_branch: z.union([z.number(), z.string()]).optional(),
  reverse_delivery_note: z.boolean().optional(),
  reverse_delivery_note_purpose: z.number().optional(),
});
export type WrappDeliveryDetail = z.infer<typeof wrappDeliveryDetail>;

export const wrappInvoiceRequest = z.object({
  invoice_type_code: z.string(),
  billing_book_id: z.string(),
  branch: z.string().optional(),
  payment_method_type: z.number(),
  payment_details: z.string().optional(),
  currency: z.string().optional(),
  exchange_rate: z.number().optional(),
  net_total_amount: z.number(),
  vat_total_amount: z.number(),
  total_amount: z.number(),
  payable_total_amount: z.number(),
  notes: z.string().optional(),
  correlated_invoices: z.array(z.string()).optional(),
  is_delivery_note: z.boolean().optional(),
  delivery_detail: wrappDeliveryDetail.optional(),
  invoice_lines: z.array(wrappInvoiceLine).min(1),
  counterpart: wrappInvoiceCounterpart.optional(),
  customer_emails: z.array(z.string()).optional(),
  email_locale: z.enum(["el", "en"]).optional(),
  generate_pdf: z.boolean().optional(),
  draft: z.boolean().optional(),
  mark_as_paid: z.boolean().optional(),
  num: z.number().optional(),
});
export type WrappInvoiceRequest = z.infer<typeof wrappInvoiceRequest>;

// The API returns either a full invoice (issued/cancelled), a pending marker,
// or an error envelope. Model each as its own shape and union them.
const wrappInvoiceIssued = z.object({
  id: z.string(),
  my_data_mark: z.string().nullish(),
  my_data_uid: z.string().nullish(),
  my_data_qr_url: z.string().nullish(),
  series: z.string().nullish(),
  num: z.number().nullish(),
  cancelled_by_mark: z.string().nullish(),
  wrapp_invoice_url: z.string().nullish(),
  wrapp_invoice_url_en: z.string().nullish(),
});
export type WrappInvoiceIssued = z.infer<typeof wrappInvoiceIssued>;

const wrappInvoicePending = z.object({
  status: z.literal("pending"),
  invoice_id: z.string(),
});

const wrappInvoiceErrorEnvelope = z.object({
  status: z.string().optional(),
  errors: z
    .array(
      z.object({
        code: z.union([z.string(), z.number()]).optional(),
        message: z.string().optional(),
        title: z.string().optional(),
      }),
    )
    .optional(),
});

export const wrappInvoiceResponse = z.union([
  wrappInvoiceIssued,
  wrappInvoicePending,
  wrappInvoiceErrorEnvelope,
]);
export type WrappInvoiceResponse = z.infer<typeof wrappInvoiceResponse>;

// ─── PDF endpoints ────────────────────────────────────────────────────────

export const wrappPdfImmediate = z.object({
  download_url: z.string(),
});
export const wrappPdfQueued = z.object({
  status: z.string(),
});

// ─── Catering tables ──────────────────────────────────────────────────────

export const wrappCateringTable = z.object({
  id: z.string(),
  status: z.enum(["available", "open", "closed", "alert"]),
  name: z.string(),
  total: z.union([z.string(), z.number()]).nullish(),
  invoices: z.array(z.string()).optional(),
  error_message: z.string().nullish(),
});
export type WrappCateringTable = z.infer<typeof wrappCateringTable>;

// ─── POS devices ──────────────────────────────────────────────────────────

export const wrappPosDevice = z.object({
  id: z.string(),
  name: z.string(),
  terminal_id: z.string(),
  merchant_id: z.string().nullish(),
});
export type WrappPosDevice = z.infer<typeof wrappPosDevice>;

// ─── Webhook payloads ─────────────────────────────────────────────────────

export const wrappInvoiceIssuedWebhook = z.object({
  id: z.string(),
  my_data_mark: z.string().nullish(),
  my_data_uid: z.string().nullish(),
  my_data_qr_url: z.string().nullish(),
  series: z.string().nullish(),
  num: z.number().nullish(),
  cancelled_by_mark: z.string().nullish(),
  wrapp_invoice_url: z.string().nullish(),
  wrapp_invoice_url_en: z.string().nullish(),
});

export const wrappPosPaymentWebhook = z.object({
  errors: z.string(),
  invoice_id: z.string(),
});

export const wrappPdfWebhook = z.object({
  invoice_id: z.string(),
  download_url: z.string(),
});
