import { redirect } from "next/navigation";

/**
 * /admin/staging → /staging redirect.
 *
 * The runtime staging-mode entry lives at /staging (public route,
 * middleware sets the cookie there). Admins reasonably guess
 * /admin/staging because they're inside the admin panel — this
 * one-line redirect makes that guess Just Work instead of showing
 * a 404.
 */
export const dynamic = "force-dynamic";

export default function AdminStagingRedirect() {
  redirect("/staging");
}
