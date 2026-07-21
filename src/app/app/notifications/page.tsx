import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPublishedAnnouncements } from "@/lib/announcements";
import { NotificationsClient } from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireTenant();
  const items = await getPublishedAnnouncements();

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
