import { Home, LogIn } from "lucide-react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white">
      <ErrorScreen
        code="404"
        title="Η σελίδα δεν βρέθηκε"
        description={
          <>
            Η διεύθυνση που πληκτρολόγησες δεν αντιστοιχεί σε κάποια σελίδα.
            Ίσως έχει μετακινηθεί ή δεν υπάρχει πλέον.
          </>
        }
        actions={[
          { href: "/", label: "Αρχική σελίδα", icon: Home },
          {
            href: "/login",
            label: "Σύνδεση στην εφαρμογή",
            variant: "secondary",
            icon: LogIn,
          },
        ]}
      />
    </div>
  );
}
