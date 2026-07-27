// Plain constants shared between the "use server" action file and the
// "use client" form. Kept out of feedback-actions.ts because Next 15
// strips non-function exports from server-action modules when they end
// up in the client bundle, which broke the /contact prerender with
// "FEEDBACK_CATEGORIES.map is not a function".

export const FEEDBACK_CATEGORIES = [
  "Παραστατικά",
  "Πελάτες",
  "Είδη & Υπηρεσίες",
  "Πληρωμές",
  "Έξοδα",
  "Ραντεβού",
  "CRM",
  "POS",
  "Αναφορές",
  "Σύνδεση με Wrapp / myDATA",
  "Ρυθμίσεις / Λογαριασμός",
  "Άλλο",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
