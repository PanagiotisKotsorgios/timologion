import "server-only";
import { prisma } from "@/lib/db";

/**
 * Small typed catalogue of app-wide settings. Adding a new setting means
 * appending an entry here; admins can edit values from /admin/system-settings.
 */
export type AppSettingKey =
  | "default_vat_rate"
  | "starter_monthly_document_limit"
  | "support_email"
  | "brand_short_name"
  | "provider_partner_url"
  | "signup_open";

export type SettingType = "number" | "string" | "boolean";

export const APP_SETTING_CATALOG: {
  key: AppSettingKey;
  label: string;
  description: string;
  type: SettingType;
  default: string;
}[] = [
  {
    key: "default_vat_rate",
    label: "Προεπιλεγμένος ΦΠΑ (%)",
    description:
      "Χρησιμοποιείται σε νέα είδη/υπηρεσίες αν δεν οριστεί άλλο ποσοστό.",
    type: "number",
    default: "24",
  },
  {
    key: "starter_monthly_document_limit",
    label: "Όριο μηνιαίων παραστατικών (Starter)",
    description: "Πόσα παραστατικά ανά μήνα επιτρέπονται στο πακέτο Starter.",
    type: "number",
    default: "25",
  },
  {
    key: "support_email",
    label: "Email υποστήριξης",
    description: "Το email που εμφανίζεται στη διεπαφή και στα μηνύματα.",
    type: "string",
    default: "support@timologion.gr",
  },
  {
    key: "brand_short_name",
    label: "Σύντομο όνομα πλατφόρμας",
    description: "Χρησιμοποιείται σε τίτλους και μηνύματα συστήματος.",
    type: "string",
    default: "timologion",
  },
  {
    key: "provider_partner_url",
    label: "URL παρόχου έκδοσης",
    description:
      "URL που ανοίγει το κουμπί «Ενεργοποίηση τώρα» στο modal ενεργοποίησης.",
    type: "string",
    default: "https://wrapp.ai/el/api/becomeapartner",
  },
  {
    key: "signup_open",
    label: "Ανοιχτές εγγραφές",
    description: "Αν είναι απενεργοποιημένο, δεν επιτρέπονται νέες εγγραφές.",
    type: "boolean",
    default: "true",
  },
];

export async function loadAppSettings(): Promise<
  Record<AppSettingKey, string>
> {
  const rows = await prisma.appSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<AppSettingKey, string>;
  for (const s of APP_SETTING_CATALOG) {
    out[s.key] = map.get(s.key) ?? s.default;
  }
  return out;
}

export async function getAppSetting(key: AppSettingKey): Promise<string> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (row) return row.value;
  return APP_SETTING_CATALOG.find((s) => s.key === key)?.default ?? "";
}
