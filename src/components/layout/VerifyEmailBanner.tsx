import { Mail } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { VerifyEmailBannerResend } from "./VerifyEmailBannerResend";

/**
 * Server-rendered banner that appears above the topbar for users whose
 * emailVerifiedAt is still null. Zero cost when already verified — one small
 * query and no client JS.
 */
export async function VerifyEmailBanner() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { emailVerifiedAt: true, email: true },
  });
  if (!user || user.emailVerifiedAt) return null;

  return (
    <div className="border-b-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 text-amber-900">
        <div className="flex items-start gap-2">
          <Mail size={18} className="mt-0.5 shrink-0" aria-hidden />
          <div className="leading-relaxed">
            <p className="font-semibold">
              Το email σου <strong>{user.email}</strong> δεν έχει επιβεβαιωθεί
              ακόμη.
            </p>
            <p className="text-amber-800/90">
              Σου έχουμε στείλει email επιβεβαίωσης — έλεγξε τα εισερχόμενά
              σου (και τον φάκελο ανεπιθύμητης αλληλογραφίας). Πάτησε τον
              σύνδεσμο που περιέχει για να ενεργοποιήσεις τον λογαριασμό σου.
            </p>
          </div>
        </div>
        <VerifyEmailBannerResend />
      </div>
    </div>
  );
}
