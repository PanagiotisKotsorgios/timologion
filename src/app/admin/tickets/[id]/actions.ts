"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { formatZodError } from "@/lib/zod-el";

const replySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(2).max(20_000),
  isInternal: z.union([z.literal("1"), z.literal("")]).optional(),
});

export async function replyToTicketAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin("super_admin", "support");
  const parsed = replySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: parsed.data.ticketId },
  });
  if (!ticket) return { ok: false, error: "Το ticket δεν βρέθηκε." };

  const isInternal = parsed.data.isInternal === "1";

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: ctx.userId,
        senderEmail: ctx.email,
        senderName: ctx.fullName,
        body: parsed.data.body,
        isInternal,
      },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        // Public reply → we're waiting on the customer next.
        // Internal note doesn't change customer-facing status.
        ...(isInternal
          ? {}
          : { status: "waiting_customer", updatedAt: new Date() }),
      },
    }),
  ]);

  if (!isInternal) {
    // Send the reply email to the customer. Bounce/failure is logged
    // via the send layer's own audit — we just move on.
    const url = `${env.APP_BASE_URL.replace(/\/$/, "")}/support/${ticket.id}`;
    await sendEmail({
      to: { email: ticket.fromEmail, name: ticket.fromName ?? "" },
      subject: `[Ticket #${ticket.id.slice(-6).toUpperCase()}] ${ticket.subject}`,
      html: `<p>${escapeHtml(parsed.data.body).replace(/\n/g, "<br>")}</p>
             <hr>
             <p style="font-size:12px;color:#666">
               Απαντάς σε ticket #${ticket.id.slice(-6).toUpperCase()} στο timologion.gr.<br>
               Δες το πλήρες ιστορικό: <a href="${url}">${url}</a>
             </p>`,
      text: parsed.data.body,
      tags: ["support-reply"],
    }).catch(() => undefined);
  }

  await logAudit({
    userId: ctx.userId,
    action: isInternal
      ? "admin.ticket.internal_note"
      : "admin.ticket.reply",
    entityType: "SupportTicket",
    entityId: ticket.id,
  });

  revalidatePath(`/admin/tickets/${ticket.id}`);
  revalidatePath("/admin/tickets");
  return { ok: true };
}

const updateSchema = z.object({
  ticketId: z.string().min(1),
  status: z
    .enum(["open", "waiting_customer", "waiting_support", "resolved", "closed"])
    .optional(),
  priority: z.coerce.number().int().min(1).max(5).optional(),
  assignedToId: z.string().max(191).optional().or(z.literal("")),
  category: z.string().max(60).optional().or(z.literal("")),
});

export async function updateTicketAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin", "support");
  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.priority) data.priority = parsed.data.priority;
  if ("assignedToId" in parsed.data)
    data.assignedToId = parsed.data.assignedToId || null;
  if ("category" in parsed.data)
    data.category = parsed.data.category || null;

  await prisma.supportTicket.update({
    where: { id: parsed.data.ticketId },
    data,
  });

  await logAudit({
    userId: ctx.userId,
    action: "admin.ticket.update",
    entityType: "SupportTicket",
    entityId: parsed.data.ticketId,
    meta: data as Record<string, unknown>,
  });

  revalidatePath(`/admin/tickets/${parsed.data.ticketId}`);
  revalidatePath("/admin/tickets");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
