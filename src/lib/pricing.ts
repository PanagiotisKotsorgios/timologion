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
  /** Wrapp partner price (incl. Greek 24% VAT). */
  wrappPriceInclVat: number;
  /** timologion.gr markup (incl. VAT). */
  markupInclVat: number;
  /** Final retail price — wrappPriceInclVat + markupInclVat. */
  retailInclVat: number;
  /** Feature bullets shown on the marketing card. */
  features: string[];
  /** True for the "recommended" call-out tier. */
  featured?: boolean;
};

export const PRICING_TIERS: PricingTier[] = [
  {
    code: "basic",
    name: "Basic",
    tagline: "Ιδανικό σημείο εκκίνησης — freelancers και μικρές επιχειρήσεις.",
    docsPerYear: 1_500,
    wrappPriceInclVat: 35.96,
    markupInclVat: 5.0,
    retailInclVat: 40.96,
    features: [
      "1.500 παραστατικά / έτος",
      "Ηλεκτρονική τιμολόγηση myDATA",
      "Αναζήτηση ΑΦΜ και αυτόματη συμπλήρωση πελατών",
      "Είδη, υπηρεσίες, PDF / εκτύπωση / email",
      "1 χρήστης",
      "Email υποστήριξη",
    ],
  },
  {
    code: "growth", // ← DB code stays 'growth' (rename would break existing subs)
    name: "Standard",
    tagline: "Για μικρές επιχειρήσεις με σταθερή ροή εκδόσεων.",
    docsPerYear: 6_000,
    wrappPriceInclVat: 122.76,
    markupInclVat: 10.0,
    retailInclVat: 132.76,
    featured: true,
    features: [
      "6.000 παραστατικά / έτος",
      "Όλα του Basic",
      "Εισπράξεις & πληρωμές",
      "Επαναλαμβανόμενα παραστατικά",
      "Προηγμένες αναφορές & εξαγωγές",
      "Ραντεβού & ημερολόγιο",
    ],
  },
  {
    code: "scale", // ← DB code stays 'scale'
    name: "Business",
    tagline: "Για ώριμες επιχειρήσεις με ομάδα και μεγαλύτερο όγκο.",
    docsPerYear: 18_000,
    wrappPriceInclVat: 209.56,
    markupInclVat: 15.0,
    retailInclVat: 224.56,
    features: [
      "18.000 παραστατικά / έτος",
      "Όλα του Standard",
      "POS & Ταμείο",
      "CRM (leads, ευκαιρίες, tasks)",
      "Απόθεμα ειδών & προϊόντων",
      "Έως 5 χρήστες με ρόλους",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    tagline: "Για επιχειρήσεις υψηλού όγκου συναλλαγών.",
    docsPerYear: 200_000,
    wrappPriceInclVat: 296.36,
    markupInclVat: 20.0,
    retailInclVat: 316.36,
    features: [
      "200.000 παραστατικά / έτος",
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
    wrappPriceInclVat: 680.76,
    markupInclVat: 20.0,
    retailInclVat: 700.76,
    features: [
      "750.000 παραστατικά / έτος",
      "Όλες οι λειτουργίες Pro",
      "SLA",
      "Dedicated account manager",
    ],
  },
  {
    code: "corporate",
    name: "Corporate",
    tagline: "Custom SLA · Priority engineering support.",
    docsPerYear: 4_000_000,
    wrappPriceInclVat: 2478.76,
    markupInclVat: 20.0,
    retailInclVat: 2498.76,
    features: [
      "4.000.000 παραστατικά / έτος",
      "Custom SLA",
      "Priority engineering support",
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
