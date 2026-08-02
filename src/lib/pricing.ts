/**
 * Canonical pricing catalog — the single source of truth for both the
 * marketing /pricing page and the in-app /app/settings/subscription page.
 * Prices below are the RETAIL prices (Wrapp partner price + timologion
 * markup), all inclusive of Greek 24% VAT.
 *
 * The purchase itself happens through Wrapp's onboarding UI — this
 * catalog only DISPLAYS the tiers so users know what they're picking
 * before they're redirected. Do not add UI purchase flow here.
 *
 * Data mirrors what the seed (scripts/first-boot.ts) writes into the
 * `platform_plans` table so existing BusinessSubscription rows keep
 * matching by `code`.
 */

export type PricingTier = {
  /** DB code — keep stable so existing subscriptions don't orphan. */
  code: string;
  name: string;
  tagline: string;
  /** Παραστατικά ανά έτος. */
  docsPerYear: number;
  /** API calls ανά έτος (όπου διαφέρει από τα παραστατικά). */
  apiCallsPerYear: number;
  /**
   * Internal-only: partner price + markup breakdown. Kept for finance
   * reference and admin tooling — the customer-facing UI shows only
   * `retailInclVat`.
   */
  wrappPriceInclVat: number;
  markupInclVat: number;
  /** The only price the customer sees. Incl. Greek 24% VAT. */
  retailInclVat: number;
  /** Feature bullets shown on the marketing card. */
  features: string[];
  /** True for the "recommended" call-out tier. */
  featured?: boolean;
};

/**
 * B2G (Business-to-Government) add-on for παραστατικά προς δημόσιο.
 * Optional on any tier — Wrapp charges +€30 net (+ΦΠΑ). Pass-through, no
 * timologion markup on top.
 */
export const B2G_ADDON_INCL_VAT = 37.2; // €30 * 1.24

export const PRICING_TIERS: PricingTier[] = [
  {
    code: "basic",
    name: "Basic",
    tagline: "Ιδανικό σημείο εκκίνησης — freelancers και μικρές επιχειρήσεις.",
    docsPerYear: 1_500,
    apiCallsPerYear: 1_500,
    wrappPriceInclVat: 35.96,
    markupInclVat: 10.0,
    retailInclVat: 45.96,
    features: [
      "1.500 παραστατικά / έτος",
      "1.500 API calls / έτος",
      "Ηλεκτρονική τιμολόγηση myDATA (όλοι οι τύποι παραστατικών)",
      "Αναζήτηση ΑΦΜ με αυτόματη συμπλήρωση πελάτη",
      "Απεριόριστοι πελάτες, είδη, υπηρεσίες",
      "PDF, θερμικός εκτυπωτής, αποστολή email",
      "1 χρήστης",
      "Email υποστήριξη",
    ],
  },
  {
    code: "growth", // ← DB code stays 'growth' (rename would break existing subs)
    name: "Standard",
    tagline: "Για μικρές επιχειρήσεις με σταθερή ροή εκδόσεων.",
    docsPerYear: 6_000,
    apiCallsPerYear: 15_000,
    wrappPriceInclVat: 122.76,
    markupInclVat: 20.0,
    retailInclVat: 142.76,
    featured: true,
    features: [
      "6.000 παραστατικά / έτος",
      "15.000 API calls / έτος",
      "Όλα του Basic",
      "Εισπράξεις & πληρωμές με aging report",
      "Επαναλαμβανόμενα παραστατικά (μηνιαία / ετήσια)",
      "Προηγμένες αναφορές (ΦΠΑ, έσοδα-έξοδα, εξαγωγές XLSX/PDF)",
      "Ραντεβού & ημερολόγιο πελατών",
      "Ταχύτερη υποστήριξη",
    ],
  },
  {
    code: "scale", // ← DB code stays 'scale'
    name: "Business",
    tagline: "Για ώριμες επιχειρήσεις με ομάδα και μεγαλύτερο όγκο.",
    docsPerYear: 18_000,
    apiCallsPerYear: 45_000,
    wrappPriceInclVat: 209.56,
    markupInclVat: 30.0,
    retailInclVat: 239.56,
    features: [
      "18.000 παραστατικά / έτος",
      "45.000 API calls / έτος",
      "Όλα του Standard",
      "POS & Ταμείο για λιανική",
      "CRM (leads, ευκαιρίες, tasks)",
      "Απόθεμα ειδών & προϊόντων με ειδοποιήσεις χαμηλού stock",
      "Έως 5 χρήστες με ρόλους και δικαιώματα",
      "Υποστήριξη προτεραιότητας",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    tagline: "Για επιχειρήσεις υψηλού όγκου συναλλαγών.",
    docsPerYear: 200_000,
    apiCallsPerYear: 250_000,
    wrappPriceInclVat: 296.36,
    markupInclVat: 30.0,
    retailInclVat: 326.36,
    features: [
      "200.000 παραστατικά / έτος",
      "250.000 API calls / έτος",
      "Απεριόριστοι χρήστες",
      "Όλες οι λειτουργίες Business",
      "Υποστήριξη προτεραιότητας",
    ],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    tagline: "SLA · Dedicated account manager · Όλες οι λειτουργίες Pro.",
    docsPerYear: 750_000,
    apiCallsPerYear: 750_000,
    wrappPriceInclVat: 680.76,
    markupInclVat: 30.0,
    retailInclVat: 710.76,
    features: [
      "750.000 παραστατικά / έτος",
      "750.000 API calls / έτος",
      "Όλες οι λειτουργίες Pro",
      "SLA με εγγυημένους χρόνους απόκρισης",
      "Dedicated account manager",
    ],
  },
  {
    code: "corporate",
    name: "Corporate",
    tagline: "Custom SLA · Priority engineering support.",
    docsPerYear: 4_000_000,
    apiCallsPerYear: 4_000_000,
    wrappPriceInclVat: 2478.76,
    markupInclVat: 30.0,
    retailInclVat: 2508.76,
    features: [
      "4.000.000 παραστατικά / έτος",
      "4.000.000 API calls / έτος",
      "Custom SLA",
      "Priority engineering support",
      "Αρχιτεκτονική εξατομικευμένη στις ανάγκες σου",
    ],
  },
];

const nfEur = new Intl.NumberFormat("el-GR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEur(n: number): string {
  return `${nfEur.format(n)} €`;
}

export function findTierByCode(code: string): PricingTier | null {
  return PRICING_TIERS.find((t) => t.code === code) ?? null;
}

export function findTierByName(name: string): PricingTier | null {
  return PRICING_TIERS.find((t) => t.name === name) ?? null;
}
