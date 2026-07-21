"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, setActiveBusiness } from "@/lib/auth/session";

const schema = z.object({ businessId: z.string().min(1) });

export async function switchBusinessAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = schema.safeParse({ businessId: formData.get("businessId") });
  if (!parsed.success) return;

  const membership = await prisma.businessMember.findUnique({
    where: {
      userId_businessId: {
        userId: session.userId,
        businessId: parsed.data.businessId,
      },
    },
  });
  if (!membership) return;

  await setActiveBusiness(session.sessionId, parsed.data.businessId);
  redirect("/app");
}
