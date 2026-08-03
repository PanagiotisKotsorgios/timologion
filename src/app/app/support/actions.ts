"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(5).max(20_000),
  category: z.string().max(60).optional().or(z.literal("")),
  priority: z.coerce.number().int().min(1).max(5).default(3),
});

export async function openTicketAction(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true, fullName: true },
  });
  if (!user) return { ok: false, error: "Λογαριασμός δεν βρέθηκε." };

  const ticket = await prisma.supportTicket.create({
    data: {
      subject: parsed.data.subject,
      businessId: ctx.businessId,
      userId: ctx.userId,
      fromEmail: user.email,
      fromName: user.fullName,
      category: parsed.data.category || null,
      priority: parsed.data.priority,
      status: "waiting_support",
      messages: {
        create: {
          senderEmail: user.email,
          senderName: user.fullName,
          body: parsed.data.body,
          isInternal: false,
        },
      },
    },
  });

  // Notify support inbox. If no address is configured, we just log it —
  // admins see the ticket in /admin/tickets regardless.
  await sendEmail({
    to: { email: "support@timologion.gr", name: "Support inbox" },
    subject: `[New ticket] ${parsed.data.subject}`,
    html: `<p>${(parsed.data.body).slice(0, 200)}...</p><p>Άνοιξε: <a href="${env.APP_BASE_URL}/admin/tickets/${ticket.id}">${ticket.id}</a></p>`,
    text: parsed.data.body,
    tags: ["new-ticket"],
  }).catch(() => undefined);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "support.ticket.create",
    entityType: "SupportTicket",
    entityId: ticket.id,
    meta: { subject: parsed.data.subject },
  });

  revalidatePath("/app/support");
  return { ok: true, id: ticket.id };
}
