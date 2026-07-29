"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getWrappClient, WrappApiError } from "@/lib/wrapp/client";
import { getWrappSettings } from "@/lib/wrapp/settings";

/**
 * Phase 1: this action triggers a "verification" against the stubbed Wrapp
 * client and records the result on the WrappConnection row. In Phase 2 this
 * will call the real API and only mark the connection active if the returned
 * tenant details confirm plan + issue permission.
 */
export async function refreshWrappStatusAction() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

  try {
    const details = await getWrappClient().getTenantDetails(ctx.businessId);

    await prisma.wrappConnection.upsert({
      where: { businessId: ctx.businessId },
      create: {
        businessId: ctx.businessId,
        status: details.issue_invoice_status ? "active" : "inactive",
        hasPlan: details.has_plan,
        canIssueInvoice: details.issue_invoice_status,
        wrappUserId: details.wrapp_user_id,
        lastVerifiedAt: new Date(),
      },
      update: {
        status: details.issue_invoice_status ? "active" : "inactive",
        hasPlan: details.has_plan,
        canIssueInvoice: details.issue_invoice_status,
        wrappUserId: details.wrapp_user_id,
        lastVerifiedAt: new Date(),
        lastError: null,
      },
    });
  } catch (err) {
    // Don't crash the settings page if Wrapp isn't reachable / not
    // configured yet — record the error so the user sees what went wrong
    // and can act (activate, add staging fallback, etc.).
    const message = err instanceof Error ? err.message : String(err);
    await prisma.wrappConnection.upsert({
      where: { businessId: ctx.businessId },
      create: {
        businessId: ctx.businessId,
        status: "error",
        lastVerifiedAt: new Date(),
        lastError: message.slice(0, 500),
      },
      update: {
        status: "error",
        lastVerifiedAt: new Date(),
        lastError: message.slice(0, 500),
      },
    });
  }

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "wrapp.status.refresh",
  });

  revalidatePath("/app/settings/wrapp");
}

// ─── Health check: run every read-only Wrapp endpoint we depend on and
// report per-step pass/fail so the operator can see exactly what's wired.

export type HealthCheckResult = {
  step: string;
  status: "pass" | "fail" | "skip";
  detail?: string;
  extra?: string;
};

export async function runWrappHealthCheckAction(): Promise<{
  results: HealthCheckResult[];
  baseUrl: string;
  hasStagingFallback: boolean;
  hasApiKey: boolean;
  hasPlan: boolean;
  canIssue: boolean;
  wrappUserId: string | null;
}> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

  const results: HealthCheckResult[] = [];
  const settings = await getWrappSettings();
  const conn = await prisma.wrappConnection.findUnique({
    where: { businessId: ctx.businessId },
  });

  // Step 1: Config sanity
  if (!settings.baseUrl) {
    results.push({
      step: "Ρυθμίσεις",
      status: "fail",
      detail: "Δεν έχει οριστεί WRAPP_API_BASE_URL — δεν μπορούμε να κάνουμε καμία κλήση.",
    });
    return {
      results,
      baseUrl: settings.baseUrl,
      hasStagingFallback: false,
      hasApiKey: false,
      hasPlan: false,
      canIssue: false,
      wrappUserId: null,
    };
  }
  results.push({
    step: "Ρυθμίσεις",
    status: "pass",
    detail: `Base URL: ${settings.baseUrl}`,
    extra: `Partner key: ${settings.partnerApiKey ? "παρών" : "λείπει"} · Webhook secret: ${
      settings.webhookSecret ? "παρών" : "λείπει"
    }`,
  });

  // Step 2: Credentials source
  const hasTenantApiKey = Boolean(conn?.encryptedApiKey);
  const hasStagingFallback = Boolean(
    settings.stagingTenantApiKey && settings.stagingTenantEmail,
  );
  if (!hasTenantApiKey && !hasStagingFallback) {
    results.push({
      step: "Διαπιστευτήρια",
      status: "fail",
      detail:
        "Δεν υπάρχουν διαπιστευτήρια Wrapp — ούτε api_key επιχείρησης ούτε staging fallback. Ολοκλήρωσε την ενεργοποίηση ή όρισε WRAPP_STAGING_TENANT_*.",
    });
    return {
      results,
      baseUrl: settings.baseUrl,
      hasStagingFallback,
      hasApiKey: false,
      hasPlan: false,
      canIssue: false,
      wrappUserId: null,
    };
  }
  results.push({
    step: "Διαπιστευτήρια",
    status: "pass",
    detail: hasTenantApiKey
      ? `Επιχείρηση με api_key (email: ${conn?.wrappEmail ?? "—"})`
      : `Staging fallback (email: ${settings.stagingTenantEmail ?? "—"})`,
  });

  const client = getWrappClient();

  // Step 3: /tenant_details (validates JWT flow + confirms plan/issue)
  let hasPlan = false;
  let canIssue = false;
  let wrappUserId: string | null = null;
  try {
    const details = await client.getTenantDetails(ctx.businessId);
    hasPlan = details.has_plan;
    canIssue = details.issue_invoice_status;
    wrappUserId = details.wrapp_user_id ?? null;
    results.push({
      step: "GET /tenant_details",
      status: "pass",
      detail: `wrapp_user_id=${wrappUserId ?? "—"} · has_plan=${
        hasPlan ? "ναι" : "όχι"
      } · issue_invoice_status=${canIssue ? "ναι" : "όχι"}`,
    });
  } catch (err) {
    results.push({
      step: "GET /tenant_details",
      status: "fail",
      detail: err instanceof Error ? err.message : String(err),
    });
    return {
      results,
      baseUrl: settings.baseUrl,
      hasStagingFallback,
      hasApiKey: hasTenantApiKey,
      hasPlan,
      canIssue,
      wrappUserId,
    };
  }

  // Step 4: /branches (needed for branch_code on invoices)
  try {
    const branches = await client.listBranches(ctx.businessId);
    results.push({
      step: "GET /branches",
      status: "pass",
      detail: `${branches.length} υποκαταστήματα`,
      extra: branches
        .slice(0, 3)
        .map((b) => `${b.name} (code=${b.code})`)
        .join(" · "),
    });
  } catch (err) {
    results.push({
      step: "GET /branches",
      status: "fail",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 5: /billing_books
  try {
    const books = await client.listBillingBooks(ctx.businessId);
    results.push({
      step: "GET /billing_books",
      status: "pass",
      detail: `${books.length} σειρές παραστατικών`,
      extra: books
        .slice(0, 4)
        .map((b) => `${b.name} (${b.series}, ${b.invoice_type_code})`)
        .join(" · "),
    });
  } catch (err) {
    results.push({
      step: "GET /billing_books",
      status: "fail",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 6: /vat_search — try to look up ourselves, a light exercise of the
  // read-only path.
  try {
    const biz = await prisma.business.findUnique({
      where: { id: ctx.businessId },
      select: { vatNumber: true },
    });
    if (biz?.vatNumber) {
      const found = await client.vatSearch(ctx.businessId, biz.vatNumber);
      results.push({
        step: "GET /vat_search",
        status: found ? "pass" : "fail",
        detail: found
          ? `Επιστράφηκε: ${found.legal_name}${found.tax_office ? " · " + found.tax_office : ""}`
          : "Δεν βρέθηκε επιχείρηση για το ΑΦΜ σου — έλεγξε ότι είναι έγκυρος.",
      });
    } else {
      results.push({
        step: "GET /vat_search",
        status: "skip",
        detail: "Παράλειψη — η επιχείρηση δεν έχει ΑΦΜ.",
      });
    }
  } catch (err) {
    results.push({
      step: "GET /vat_search",
      status: "fail",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 7: /invoices/issued_count — cheap counter check
  try {
    const count = await client.issuedCount(ctx.businessId);
    results.push({
      step: "GET /invoices/issued_count",
      status: "pass",
      detail: `${count} παραστατικά συνολικά στη Wrapp`,
    });
  } catch (err) {
    results.push({
      step: "GET /invoices/issued_count",
      status: err instanceof WrappApiError && err.httpStatus === 404 ? "skip" : "fail",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "wrapp.health_check",
    meta: {
      passed: results.filter((r) => r.status === "pass").length,
      failed: results.filter((r) => r.status === "fail").length,
    },
  });

  return {
    results,
    baseUrl: settings.baseUrl,
    hasStagingFallback,
    hasApiKey: hasTenantApiKey,
    hasPlan,
    canIssue,
    wrappUserId,
  };
}
