import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { runExport } from "@/lib/admin-exports";
import { xlsxResponse } from "@/lib/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const ctx = await requireAdmin("super_admin", "support", "analyst");
  const { entity } = await params;

  const url = new URL(req.url);
  const res = await runExport(entity, url.searchParams);
  if (!res) {
    return NextResponse.json(
      { error: `Unknown export target "${entity}".` },
      { status: 404 },
    );
  }

  await logAudit({
    userId: ctx.userId,
    action: "admin.export",
    entityType: entity,
    meta: { params: url.search },
  });

  return xlsxResponse(res.buffer, res.filename);
}
