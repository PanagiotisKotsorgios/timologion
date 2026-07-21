"use server";

import { z } from "zod";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(160),
  company: z.string().max(160).optional().or(z.literal("")),
  message: z.string().min(10).max(4000),
});

export type ContactState = { error?: string; success?: string } | undefined;

export async function submitContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  // No email backend yet; log server-side for now so nothing is lost.
  // eslint-disable-next-line no-console
  console.info("[contact]", parsed.data);

  return {
    success:
      "Ευχαριστούμε! Θα επικοινωνήσουμε μαζί σου εντός μιας εργάσιμης ημέρας.",
  };
}
