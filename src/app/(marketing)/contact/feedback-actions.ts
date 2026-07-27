"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { formatZodError } from "@/lib/zod-el";
import { getSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { consume, clientIp } from "@/lib/rate-limit";
import { FEEDBACK_CATEGORIES } from "./feedback-config";

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "other"]),
  severity: z.enum(["low", "medium", "high", "blocker"]).default("medium"),
  category: z.enum(FEEDBACK_CATEGORIES),
  title: z.string().min(4).max(200),
  description: z.string().min(20).max(6000),
  reproSteps: z.string().max(4000).optional().or(z.literal("")),
  submitterName: z.string().min(2).max(120),
  submitterEmail: z.string().email().max(160),
  businessName: z.string().max(160).optional().or(z.literal("")),
  pageUrl: z.string().max(500).optional().or(z.literal("")),
});

export type FeedbackState =
  | { error?: string; success?: string; id?: string }
  | undefined;

const TYPE_LABEL: Record<string, string> = {
  bug: "Πρόβλημα",
  feature: "Πρόταση χαρακτηριστικού",
  other: "Άλλο",
};

const SEVERITY_LABEL: Record<string, string> = {
  low: "Χαμηλή",
  medium: "Μεσαία",
  high: "Υψηλή",
  blocker: "Blocker",
};

/**
 * Persist the report + fire a support email. Even if the email fails we
 * still return success as long as the DB row saved — support can pull
 * from the admin queue as a fallback. Prevents feedback loss on Brevo
 * hiccups.
 */
export async function submitFeedbackAction(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const hdrs = await headers();
  const rl = consume(
    `feedback:${clientIp(hdrs)}`,
    5,
    60_000,
  );
  if (!rl.ok) {
    return {
      error: `Πάρα πολλές αποστολές. Δοκίμασε ξανά σε ${rl.retryAfter} δευτ.`,
    };
  }

  const parsed = feedbackSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const session = await getSession().catch(() => null);
  const userAgent = hdrs.get("user-agent")?.slice(0, 400) ?? null;

  const row = await prisma.feedbackReport.create({
    data: {
      type: parsed.data.type,
      severity: parsed.data.severity,
      category: parsed.data.category,
      title: parsed.data.title.trim(),
      description: parsed.data.description.trim(),
      reproSteps: parsed.data.reproSteps || null,
      submitterName: parsed.data.submitterName.trim(),
      submitterEmail: parsed.data.submitterEmail.trim().toLowerCase(),
      businessName: parsed.data.businessName || null,
      userId: session?.userId ?? null,
      businessId: session?.activeBusinessId ?? null,
      userAgent,
      pageUrl: parsed.data.pageUrl || null,
    },
  });

  const typeLabel = TYPE_LABEL[parsed.data.type] ?? parsed.data.type;
  const severityLabel = SEVERITY_LABEL[parsed.data.severity] ?? parsed.data.severity;

  await sendEmail({
    to: { email: "support@timologion.gr", name: "Τιμολόγιον Support" },
    subject: `[${typeLabel}] ${parsed.data.title.slice(0, 140)}`,
    html: renderFeedbackHtml({
      id: row.id,
      typeLabel,
      severityLabel,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
      reproSteps: parsed.data.reproSteps || null,
      submitterName: parsed.data.submitterName,
      submitterEmail: parsed.data.submitterEmail,
      businessName: parsed.data.businessName || null,
      pageUrl: parsed.data.pageUrl || null,
      userAgent,
    }),
    text: renderFeedbackText({
      id: row.id,
      typeLabel,
      severityLabel,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
      reproSteps: parsed.data.reproSteps || null,
      submitterName: parsed.data.submitterName,
      submitterEmail: parsed.data.submitterEmail,
      businessName: parsed.data.businessName || null,
      pageUrl: parsed.data.pageUrl || null,
      userAgent,
    }),
    tags: ["feedback", parsed.data.type],
  }).catch(() => undefined);

  return {
    success:
      "Καταχωρήθηκε. Θα λάβεις email επιβεβαίωσης από την ομάδα υποστήριξης εντός μιας εργάσιμης ημέρας.",
    id: row.id,
  };
}

type RenderInput = {
  id: string;
  typeLabel: string;
  severityLabel: string;
  category: string;
  title: string;
  description: string;
  reproSteps: string | null;
  submitterName: string;
  submitterEmail: string;
  businessName: string | null;
  pageUrl: string | null;
  userAgent: string | null;
};

function renderFeedbackHtml(v: RenderInput): string {
  const esc = (s: string) =>
    s.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
  return `
    <h2 style="margin:0 0 8px">${esc(v.typeLabel)}: ${esc(v.title)}</h2>
    <p style="color:#64748b;margin:0 0 16px">
      Κατηγορία: <strong>${esc(v.category)}</strong>
      · Σοβαρότητα: <strong>${esc(v.severityLabel)}</strong>
      · ID: <code>${esc(v.id)}</code>
    </p>
    <h3 style="margin:16px 0 4px">Περιγραφή</h3>
    <p>${esc(v.description)}</p>
    ${
      v.reproSteps
        ? `<h3 style="margin:16px 0 4px">Βήματα αναπαραγωγής</h3><p>${esc(v.reproSteps)}</p>`
        : ""
    }
    <h3 style="margin:24px 0 4px">Χρήστης</h3>
    <p>
      ${esc(v.submitterName)} &lt;${esc(v.submitterEmail)}&gt;<br/>
      ${v.businessName ? `Επιχείρηση: ${esc(v.businessName)}<br/>` : ""}
      ${v.pageUrl ? `Σελίδα: <a href="${esc(v.pageUrl)}">${esc(v.pageUrl)}</a><br/>` : ""}
      ${v.userAgent ? `<span style="color:#94a3b8;font-size:12px">${esc(v.userAgent)}</span>` : ""}
    </p>`;
}

function renderFeedbackText(v: RenderInput): string {
  return [
    `[${v.typeLabel}] ${v.title}`,
    `Κατηγορία: ${v.category}`,
    `Σοβαρότητα: ${v.severityLabel}`,
    `ID: ${v.id}`,
    "",
    "Περιγραφή:",
    v.description,
    v.reproSteps ? "\nΒήματα αναπαραγωγής:\n" + v.reproSteps : "",
    "",
    `Από: ${v.submitterName} <${v.submitterEmail}>`,
    v.businessName ? `Επιχείρηση: ${v.businessName}` : "",
    v.pageUrl ? `Σελίδα: ${v.pageUrl}` : "",
    v.userAgent ? `UA: ${v.userAgent}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
