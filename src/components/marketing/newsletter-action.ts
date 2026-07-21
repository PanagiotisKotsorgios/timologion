"use server";

import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export type NewsletterState = { error?: string; success?: string } | undefined;

export async function subscribeNewsletterAction(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Παρακαλώ δώσε ένα έγκυρο email." };
  }
  // No email backend yet — log for now.
  // eslint-disable-next-line no-console
  console.info("[newsletter]", parsed.data.email);
  return { success: "Ευχαριστούμε! Θα σε ενημερώνουμε με χρήσιμα νέα." };
}
