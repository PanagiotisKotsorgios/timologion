import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/login/actions";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { BusinessSwitcher } from "./BusinessSwitcher";
import { NotificationsBell } from "./NotificationsBell";
import { SidebarTrigger } from "./Sidebar";
import {
  getPublishedAnnouncements,
  getUserNotifications,
  type Announcement,
} from "@/lib/announcements";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

type BusinessOption = {
  id: string;
  label: string;
};

type TopbarProps = {
  userName: string;
  activeBusinessId: string;
  businesses: BusinessOption[];
};

export async function Topbar({
  userName,
  activeBusinessId,
  businesses,
}: TopbarProps) {
  const session = await getSession();
  const [announcements, userNotifs, meVerified] = await Promise.all([
    getPublishedAnnouncements(),
    session ? getUserNotifications(session.userId) : Promise.resolve([]),
    session
      ? prisma.user
          .findUnique({
            where: { id: session.userId },
            select: { emailVerifiedAt: true, email: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  // Ad-hoc "verify your email" pinned notification. Injected first so it
  // sits at the top of the notifications bell for as long as the user is
  // unverified. Removed automatically once emailVerifiedAt is set.
  const pinned: Announcement[] = [];
  if (meVerified && !meVerified.emailVerifiedAt) {
    pinned.push({
      id: "sys:verify-email",
      tone: "warning",
      title: "Επιβεβαίωση email",
      body: `Το email σου <strong>${meVerified.email}</strong> δεν έχει επιβεβαιωθεί ακόμη. Σου έχουμε στείλει email επιβεβαίωσης — έλεγξε τα εισερχόμενά σου (και τον φάκελο ανεπιθύμητης αλληλογραφίας) και πάτησε τον σύνδεσμο.`,
      href: "/verify-email",
      cta: "Άνοιξε τη σελίδα επιβεβαίωσης",
      publishedAt: new Date().toISOString(),
    });
  }

  // User notifications first (more actionable), then platform announcements.
  const items: Announcement[] = [...pinned, ...userNotifs, ...announcements];
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b-2 border-ink-300 bg-white px-3 md:h-20 md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        <SidebarTrigger />
        <BusinessSwitcher
          activeBusinessId={activeBusinessId}
          businesses={businesses}
        />
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <NotificationsBell items={items} />
        <div className="hidden text-right lg:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
            Χρήστης
          </p>
          <p className="text-base font-semibold text-ink-900">{userName}</p>
        </div>
        <form action={logoutAction}>
          {/* Icon-only on very small screens, full text from md+ */}
          <Button
            variant="danger"
            size="md"
            type="submit"
            icon={LogOut}
            className="px-3 md:px-5"
            aria-label={t.auth.logout}
          >
            <span className="hidden sm:inline">{t.auth.logout}</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
