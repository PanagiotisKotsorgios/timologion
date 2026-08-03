"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(2).max(20_000),
});

export async function tenantReplyAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: parsed.data.ticketId,
      OR: [{ userId: ctx.userId }, { businessId: ctx.businessId }],
    },
  });
  if (!ticket) return { ok: false, error: "Το ticket δεν βρέθηκε." };
  if (ticket.status === "closed")
    return { ok: false, error: "Το ticket είναι κλειστό." };

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true, fullName: true },
  });

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderEmail: user?.email ?? "",
        senderName: user?.fullName ?? null,
        body: parsed.data.body,
        isInternal: false,
      },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "waiting_support" },
    }),
  ]);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "support.ticket.reply",
    entityType: "SupportTicket",
    entityId: ticket.id,
  });

  revalidatePath(`/app/support/${ticket.id}`);
  revalidatePath(`/admin/tickets/${ticket.id}`);
  return { ok: true };
}
