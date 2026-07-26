import Link from "next/link";
import {
  Building2,
  CreditCard,
  MapPin,
  Hash,
  Send,
  KeyRound,
  UserCog,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

type SettingCard = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

/**
 * Single hub that gathers every business-configuration surface. The sidebar
 * used to expose all eight of these as separate rows — too many for a
 * beginner user. This page keeps everything reachable in one hop without
 * cluttering the main navigation.
 */
const CARDS: SettingCard[] = [
  {
    href: "/app/settings/business",
    icon: Building2,
    title: "Επιχείρηση",
    description: "Στοιχεία εταιρείας, ΑΦΜ, δραστηριότητα, στοιχεία επικοινωνίας.",
  },
  {
    href: "/app/settings/branches",
    icon: MapPin,
    title: "Υποκαταστήματα",
    description: "Διεύθυνση και κωδικοποίηση για κάθε φυσικό σημείο πώλησης.",
  },
  {
    href: "/app/settings/billing-books",
    icon: Hash,
    title: "Σειρές παραστατικών",
    description:
      "Σειρά και αύξοντες αριθμοί ανά τύπο παραστατικού. Αυτόματα φτιάχνονται στην πρώτη έκδοση.",
  },
  {
    href: "/app/settings/wrapp",
    icon: Send,
    title: "Ηλεκτρονική έκδοση",
    description:
      "Κατάσταση σύνδεσης με τον πάροχο, χειροκίνητη επανασυγχρόνιση.",
  },
  {
    href: "/app/settings/aade",
    icon: KeyRound,
    title: "Αναζήτηση ΑΦΜ (ΓΓΠΣ)",
    description: "Διαπιστευτήρια για αυτόματη συμπλήρωση στοιχείων πελατών.",
  },
  {
    href: "/app/settings/subscription",
    icon: CreditCard,
    title: "Συνδρομή",
    description: "Πακέτο, χρέωση και ιστορικό παραστατικών συνδρομής.",
  },
  {
    href: "/app/settings/users",
    icon: UserCog,
    title: "Χρήστες & ρόλοι",
    description: "Πρόσθεσε συνεργάτες με τα δικαιώματα που τους αντιστοιχούν.",
  },
];

export const dynamic = "force-dynamic";

export default function SettingsHubPage() {
  return (
    <>
      <PageHeader
        title="Ρυθμίσεις"
        subtitle="Όλες οι ρυθμίσεις της επιχείρησής σου σε ένα σημείο."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <SettingsTile key={c.href} card={c} />
        ))}
      </div>
    </>
  );
}

function SettingsTile({ card }: { card: SettingCard }) {
  const Icon = card.icon;
  return (
    <Link href={card.href} className="block outline-none">
      <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-soft">
        <CardBody className="flex flex-1 flex-col">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-800">
              <Icon size={22} aria-hidden />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-extrabold text-brand-900">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                {card.description}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end text-sm font-bold text-brand-900">
            Άνοιγμα
            <ArrowRight
              size={14}
              aria-hidden
              className="ml-1 transition-transform group-hover:translate-x-0.5"
            />
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
