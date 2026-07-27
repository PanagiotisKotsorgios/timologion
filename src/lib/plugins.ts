import "server-only";
import { prisma } from "@/lib/db";
import type { PluginActivation, PluginStatus } from "@prisma/client";

/**
 * Plugin add-ons registry.
 *
 * Each plugin has an immutable `code` (persisted in PluginActivation),
 * a user-facing name/tagline, a price snapshot, and a trial window. The
 * plugins page reads this catalog to render the marketing cards; the
 * sidebar reads it to know which route + icon to show when a plugin is
 * active for the current business.
 *
 * `trialDays` = 365 (1 year) matches what marketing promises: free for
 * 1 year, then the tenant is prompted to pay to keep it enabled.
 *
 * Prices here are the platform default. If a tenant activates while the
 * platform admin has set a different price on PluginCatalog (future
 * work), that override wins at activation time and is snapshotted onto
 * `PluginActivation.priceMonthly` — so a later price change never
 * retro-bills an existing tenant.
 */
export type PluginCode = "pos" | "crm" | "reports" | "appointments";

export type PluginDefinition = {
  code: PluginCode;
  name: string;
  tagline: string;
  perks: string[];
  priceMonthly: number;
  trialDays: number;
  sidebarLabel: string;
  href: string;
  /** Icon name from lucide-react. Sidebar/plugins page look it up. */
  iconName: string;
  /** Card status when not activated. */
  availability: "available" | "coming_soon";
};

export const PLUGIN_CATALOG: PluginDefinition[] = [
  {
    code: "pos",
    name: "POS & Ταμείο",
    tagline: "Γρήγορη πώληση, τραπέζια, θερμική εκτύπωση 80mm.",
    perks: [
      "Γρήγορη πώληση σε 1 κλικ",
      "Ανοιχτά τραπέζια & catering flow",
      "Θερμική εκτύπωση αποδείξεων",
    ],
    priceMonthly: 9.9,
    trialDays: 365,
    sidebarLabel: "POS & Ταμείο",
    href: "/app/pos",
    iconName: "ShoppingCart",
    availability: "available",
  },
  {
    code: "crm",
    name: "CRM",
    tagline: "Leads, ευκαιρίες με 5 στάδια pipeline, tasks με υπενθυμίσεις.",
    perks: [
      "Leads & pipeline ευκαιριών",
      "Εργασίες με ημερομηνία λήξης",
      "Ιστορικό επικοινωνίας ανά πελάτη",
    ],
    priceMonthly: 7.9,
    trialDays: 365,
    sidebarLabel: "CRM",
    href: "/app/crm",
    iconName: "Users2",
    availability: "available",
  },
  {
    code: "reports",
    name: "Αναφορές λογιστή",
    tagline: "Έσοδα, ΦΠΑ, ανεξόφλητα, εξαγωγή σε Excel/CSV.",
    perks: [
      "Μηνιαία σύνοψη εσόδων & ΦΠΑ",
      "Ανοικτά υπόλοιπα πελατών",
      "Εξαγωγές για τον λογιστή σου",
    ],
    priceMonthly: 5.9,
    trialDays: 365,
    sidebarLabel: "Αναφορές",
    href: "/app/reports",
    iconName: "FileSpreadsheet",
    availability: "available",
  },
  {
    code: "appointments",
    name: "Ραντεβού & ημερολόγιο",
    tagline: "Κράτηση χρόνου, υπενθυμίσεις πελάτη — έρχεται.",
    perks: [
      "Ημερολόγιο πολλαπλών χρηστών",
      "Υπηρεσίες συνδεδεμένες με τιμοκατάλογο",
      "Μετατροπή ραντεβού σε παραστατικό",
    ],
    priceMonthly: 0,
    trialDays: 365,
    sidebarLabel: "Ραντεβού",
    href: "/app/appointments",
    iconName: "CalendarClock",
    availability: "coming_soon",
  },
];

export function getPluginDefinition(code: string): PluginDefinition | null {
  return PLUGIN_CATALOG.find((p) => p.code === code) ?? null;
}

export type PluginRuntimeStatus = {
  code: PluginCode;
  definition: PluginDefinition;
  activation: PluginActivation | null;
  status: PluginStatus | "not_activated";
  trialEndsAt: Date | null;
  daysLeftInTrial: number | null;
  /** Whether the tenant can currently use the plugin (trial or paid). */
  usable: boolean;
};

/**
 * Load activations for a business + compute derived usability state.
 * Called once per request on the layout so the sidebar can filter.
 */
export async function getPluginRuntime(
  businessId: string,
): Promise<Map<PluginCode, PluginRuntimeStatus>> {
  const rows = await prisma.pluginActivation
    .findMany({ where: { businessId } })
    .catch(() => [] as PluginActivation[]);
  const byCode = new Map<string, PluginActivation>();
  for (const r of rows) byCode.set(r.pluginCode, r);

  const now = Date.now();
  const out = new Map<PluginCode, PluginRuntimeStatus>();
  for (const def of PLUGIN_CATALOG) {
    const a = byCode.get(def.code) ?? null;
    let status: PluginStatus | "not_activated" = a?.status ?? "not_activated";
    let daysLeft: number | null = null;
    let trialEndsAt: Date | null = a?.trialEndsAt ?? null;

    if (a) {
      // Recompute: if the trial has silently expired we treat it as expired
      // even if a background job hasn't flipped the enum yet.
      if (
        a.status === "trialing" &&
        a.trialEndsAt.getTime() < now &&
        (a.paidUntilAt?.getTime() ?? 0) < now
      ) {
        status = "expired";
      }
      if (a.status === "trialing") {
        daysLeft = Math.max(
          0,
          Math.ceil((a.trialEndsAt.getTime() - now) / 86_400_000),
        );
      }
    }

    const usable =
      status === "trialing" ||
      status === "active" ||
      (status === "expired" && false); // hard gate on expired

    out.set(def.code, {
      code: def.code,
      definition: def,
      activation: a,
      status,
      trialEndsAt,
      daysLeftInTrial: daysLeft,
      usable,
    });
  }
  return out;
}

/**
 * Activate (or re-activate) a plugin. Behaviour:
 *   - No row yet → create with a fresh trial window.
 *   - Row exists in trialing/active → return as-is (idempotent no-op).
 *   - Row exists in cancelled/expired → flip back to trialing with a
 *     fresh trial window. Users who turned it off and changed their mind
 *     get the full 1-year clock reset from now, not the leftover.
 */
export async function activatePluginForBusiness(
  businessId: string,
  code: PluginCode,
): Promise<
  | { ok: true; activation: PluginActivation }
  | { ok: false; error: string }
> {
  const def = getPluginDefinition(code);
  if (!def) return { ok: false, error: "Άγνωστο plugin." };
  if (def.availability === "coming_soon")
    return { ok: false, error: "Αυτό το plugin δεν είναι διαθέσιμο ακόμη." };

  const existing = await prisma.pluginActivation.findUnique({
    where: { businessId_pluginCode: { businessId, pluginCode: code } },
  });

  const trialEndsAt = new Date(Date.now() + def.trialDays * 86_400_000);

  if (existing) {
    if (existing.status === "trialing" || existing.status === "active") {
      return { ok: true, activation: existing };
    }
    // cancelled / expired — re-arm the trial.
    const revived = await prisma.pluginActivation.update({
      where: { id: existing.id },
      data: {
        status: "trialing",
        trialStartedAt: new Date(),
        trialEndsAt,
        priceMonthly: def.priceMonthly,
      },
    });
    return { ok: true, activation: revived };
  }

  const activation = await prisma.pluginActivation.create({
    data: {
      businessId,
      pluginCode: code,
      status: "trialing",
      trialEndsAt,
      priceMonthly: def.priceMonthly,
    },
  });
  return { ok: true, activation };
}
