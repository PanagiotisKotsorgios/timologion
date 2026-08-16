import { redirect } from "next/navigation";

/**
 * Fallback for /staging/exit. The middleware normally intercepts this
 * URL, clears the runtime-mode cookie, and redirects to /app. Rendering
 * this page means middleware didn't run (very rare — e.g. the matcher
 * didn't apply), so we still bounce the user to /app rather than
 * showing a blank stub.
 */
export const dynamic = "force-dynamic";

export default function StagingExitFallback() {
  redirect("/app");
}
