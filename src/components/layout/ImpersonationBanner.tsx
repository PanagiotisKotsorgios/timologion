import { cookies } from "next/headers";
import { UserCog } from "lucide-react";
import { stopImpersonationAction } from "@/app/admin/actions";

/**
 * Renders a bright warning ribbon at the top of the user app when the current
 * session was created via platform-admin impersonation. Clicking "Επιστροφή"
 * restores the admin's original session cookie.
 */
export async function ImpersonationBanner() {
  const jar = await cookies();
  const returning = jar.get("etl_admin_return")?.value;
  if (!returning) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-amber-400 px-4 py-3 text-ink-900 shadow-md">
      <div className="flex items-center gap-3">
        <UserCog size={20} aria-hidden />
        <p className="text-sm font-bold md:text-base">
          Είσαι συνδεδεμένος ως χρήστης μέσω impersonation — προσοχή στις
          ενέργειές σου.
        </p>
      </div>
      <form action={stopImpersonationAction}>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-lg bg-brand-900 px-4 text-sm font-bold text-white hover:bg-black"
        >
          Επιστροφή σε admin
        </button>
      </form>
    </div>
  );
}
