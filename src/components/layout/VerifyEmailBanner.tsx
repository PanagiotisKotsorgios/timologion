import Link from "next/link";
import { Mail } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

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
    <div className="border-b-2 border-amber-300 bg-amber-50 px-4 py-2 text-sm md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-amber-900">
        <span className="inline-flex items-center gap-2">
          <Mail size={16} aria-hidden />
          <span>
            Το email σου <strong>{user.email}</strong> δεν έχει επιβεβαιωθεί
            ακόμη.
          </span>
        </span>
        <Link
          href="/verify-email"
          className="text-sm font-bold text-amber-900 underline underline-offset-2 hover:text-amber-800"
        >
          Στείλε ξανά το email
        </Link>
      </div>
    </div>
  );
}
