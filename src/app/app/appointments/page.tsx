import { CalendarDays, Users2, Package, FileText, Bell } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default function AppointmentsPage() {
  return (
    <>
      <PageHeader
        title="Ραντεβού & ημερολόγιο"
        subtitle="Κράτηση χρόνου με πελάτες, υπενθυμίσεις, μετατροπή σε παραστατικό."
      />

      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-brand-900 to-brand-800 px-8 py-10 text-white">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10">
              <CalendarDays size={32} aria-hidden />
            </div>
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-200">
                Έρχεται σύντομα
              </div>
              <h2 className="text-3xl font-extrabold md:text-4xl">
                Ημερολόγιο με έξυπνη σύνδεση στα παραστατικά
              </h2>
              <p className="mt-3 max-w-2xl text-brand-100">
                Ρυθμίζεις τις υπηρεσίες σου με τιμοκατάλογο, οι πελάτες
                κλείνουν ραντεβού, και με ένα κλικ μετατρέπεις κάθε ραντεβού
                σε τιμολόγιο ή απόδειξη. Χωρίς επιπλέον χρέωση.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Πολλαπλοί χρήστες"
            subtitle="Καθένας βλέπει το δικό του διαθέσιμο χρόνο."
            action={<Users2 size={18} className="text-brand-800" />}
          />
          <CardBody className="text-sm text-ink-700">
            Ορίζεις εργαζόμενους ή consultants, κάθε ένας έχει το δικό του
            ημερολόγιο. Οι επικαλυπτόμενες κρατήσεις εντοπίζονται
            αυτόματα.
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Υπηρεσίες με τιμοκατάλογο"
            subtitle="Σύνδεση με το ήδη υπάρχον items σου."
            action={<Package size={18} className="text-brand-800" />}
          />
          <CardBody className="text-sm text-ink-700">
            Κάθε τύπος ραντεβού συνδέεται με ένα Είδος/Υπηρεσία από τον
            κατάλογο. Η τιμή, ΦΠΑ και μονάδα μέτρησης έρχονται
            προσυμπληρωμένα.
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Μετατροπή σε παραστατικό"
            subtitle="Ένα κλικ = πρόχειρο τιμολόγιο."
            action={<FileText size={18} className="text-brand-800" />}
          />
          <CardBody className="text-sm text-ink-700">
            Όταν το ραντεβού ολοκληρώνεται, το κουμπί «Έκδοση» δημιουργεί
            πρόχειρο παραστατικό με τα σωστά στοιχεία πελάτη, υπηρεσίας
            και τιμής. Εκδίδεις κατευθείαν μέσω Wrapp.
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Υπενθυμίσεις πελάτη"
            subtitle="SMS & email πριν το ραντεβού."
            action={<Bell size={18} className="text-brand-800" />}
          />
          <CardBody className="text-sm text-ink-700">
            Αυτοματοποιημένη επικοινωνία με τον πελάτη πριν τη συνάντηση.
            Μειώνει τα no-shows και βοηθά την οργάνωση της ημέρας.
          </CardBody>
        </Card>
      </div>

      <div className="mt-8 rounded-2xl border-2 border-dashed border-ink-300 bg-white p-6 text-center">
        <p className="text-sm text-ink-700">
          Η λειτουργία βρίσκεται σε ανάπτυξη. Θα ενεργοποιηθεί για όλους
          χωρίς επιπλέον κόστος μόλις γίνει διαθέσιμη.
        </p>
      </div>
    </>
  );
}
