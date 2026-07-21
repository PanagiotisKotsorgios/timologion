import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody } from "@/components/ui/Card";
import { t } from "@/lib/i18n";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // If the user already has a business, go straight to the dashboard.
  const existing = await prisma.businessMember.count({
    where: { userId: session.userId },
  });
  if (existing > 0) redirect("/app");

  return (
    <main className="min-h-screen bg-ink-100">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-4xl font-bold tracking-tight text-ink-900 md:text-5xl">
          {t.onboarding.title}
        </h1>
        <p className="mt-4 text-lg text-ink-700 md:text-xl">
          {t.onboarding.subtitle}
        </p>

        <div className="mt-10 space-y-6">
          <Alert tone="info" title="Ενεργοποίηση έκδοσης">
            Μετά τη δημιουργία της επιχείρησης, θα μπορείς να ενεργοποιήσεις
            την υπηρεσία ηλεκτρονικής έκδοσης από τις Ρυθμίσεις.{" "}
            {t.brand.providerNote}
          </Alert>

          <Card>
            <CardBody className="p-8 md:p-10">
              <OnboardingForm />
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  );
}
