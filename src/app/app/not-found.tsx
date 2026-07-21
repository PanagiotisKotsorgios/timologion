import { LayoutDashboard, FileText } from "lucide-react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="Δεν βρέθηκε αυτή η σελίδα"
      description={
        <>
          Δεν μπορέσαμε να βρούμε αυτό που ζητάς. Ίσως ένα παραστατικό ή μια
          εγγραφή που διαγράφηκε, ή απλά ένα λάθος στη διεύθυνση.
        </>
      }
      actions={[
        { href: "/app", label: "Πίνακας ελέγχου", icon: LayoutDashboard },
        {
          href: "/app/documents",
          label: "Παραστατικά",
          variant: "secondary",
          icon: FileText,
        },
      ]}
    />
  );
}
