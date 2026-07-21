import { LayoutDashboard, Users } from "lucide-react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="Δεν βρέθηκε αυτή η σελίδα"
      description={
        <>
          Ίσως η εγγραφή έχει διαγραφεί ή η διεύθυνση δεν αντιστοιχεί σε
          κάποια οθόνη διαχείρισης.
        </>
      }
      actions={[
        { href: "/admin", label: "Επισκόπηση", icon: LayoutDashboard },
        {
          href: "/admin/users",
          label: "Χρήστες",
          variant: "secondary",
          icon: Users,
        },
      ]}
    />
  );
}
