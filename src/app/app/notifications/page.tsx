import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getPublishedAnnouncements,
  getUserNotifications,
  getSystemNotifications,
} from "@/lib/announcements";
import { getSession } from "@/lib/auth/session";
import { NotificationsClient } from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const ctx = await requireTenant();
  const session = await getSession();
  const [announcements, userNotifs, systemNotifs] = await Promise.all([
    getPublishedAnnouncements(ctx.businessId),
    session ? getUserNotifications(session.userId) : Promise.resolve([]),
    session ? getSystemNotifications(session.userId) : Promise.resolve([]),
  ]);
  // Same ordering as the Topbar bell so the two views stay consistent.
  const items = [...systemNotifs, ...userNotifs, ...announcements];

  return (
    <>
      <PageHeader
        title="Ειδοποιήσεις"
        subtitle="Όλες οι ανακοινώσεις και ειδοποιήσεις από την ομάδα του timologion."
      />
      <NotificationsClient items={items} />
    </>
  );
}
