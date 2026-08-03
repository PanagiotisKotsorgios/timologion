"use client";

import { useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Manual refresh — the page has `revalidate = 0` so probes re-run on
 * every request, but we also auto-poll every 30 seconds so the tab
 * stays live in support-desk contexts.
 */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    const id = window.setInterval(() => {
      start(() => router.refresh());
    }, 30_000);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <Button
      type="button"
      icon={pending ? RefreshCw : RefreshCw}
      variant="secondary"
      className={pending ? "[&_svg]:animate-spin" : ""}
      onClick={() => start(() => router.refresh())}
    >
      {pending ? "Ανανέωση..." : "Ανανέωση"}
    </Button>
  );
}
