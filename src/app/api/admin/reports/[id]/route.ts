import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { toXlsxBuffer, xlsxResponse } from "@/lib/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAdmin("super_admin", "analyst");
  const { id } = await params;
  const url = new URL(req.url);
  const p = url.searchParams;

  await logAudit({
    userId: ctx.userId,
    action: "admin.report.run",
    entityType: "Report",
    entityId: id,
    meta: { params: url.search },
  });

  switch (id) {
    case "vat_summary":
      return vatSummary(
        p.get("businessId") ?? "",
        p.get("from") ?? "",
        p.get("to") ?? "",
      );
    case "annual_income":
      return annualIncome(
        p.get("businessId") ?? "",
        p.get("year") ?? "",
      );
    case "platform_margin":
      return platformMargin(p.get("from") ?? "", p.get("to") ?? "");
    default:
      return NextResponse.json({ error: "unknown report" }, { status: 404 });
  }
}

// ─── VAT summary ───────────────────────────────────────────────────────
async function vatSummary(businessId: string, from: string, to: string) {
  if (!businessId || !from || !to)
    return NextResponse.json({ error: "missing params" }, { status: 400 });

  const rows = await prisma.documentLine.findMany({
    where: {
      document: {
        businessId,
        status: "issued",
        issueDate: {
          gte: new Date(from),
          lte: new Date(to + "T23:59:59"),
        },
      },
    },
    select: {
      vatRate: true,
      netAmount: true,
      vatAmount: true,
      totalAmount: true,
      document: {
        select: {
          type: true,
          issueDate: true,
          series: true,
          number: true,
          client: { select: { legalName: true, vatNumber: true } },
        },
      },
    },
    take: 20000,
  });

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { legalName: true, vatNumber: true },
  });

  const buffer = await toXlsxBuffer(
    rows.map((r) => ({
      date: r.document.issueDate,
      series: r.document.series ?? "",
      number: r.document.number ?? 0,
      type: r.document.type,
      client: r.document.client?.legalName ?? "",
      clientVat: r.document.client?.vatNumber ?? "",
      vatRate: Number(r.vatRate),
      net: Number(r.netAmount),
      vat: Number(r.vatAmount),
      total: Number(r.totalAmount),
    })),
    [
      { header: "Ημ/νία", value: (r) => r.date, format: "yyyy-mm-dd", width: 12 },
      { header: "Σειρά", value: (r) => r.series, width: 8 },
      { header: "Αριθμός", value: (r) => r.number, width: 10 },
      { header: "Τύπος", value: (r) => r.type, width: 22 },
      { header: "Πελάτης", value: (r) => r.client, width: 32 },
      { header: "ΑΦΜ", value: (r) => r.clientVat, width: 12 },
      { header: "ΦΠΑ %", value: (r) => r.vatRate, format: "0.00", width: 10 },
      { header: "Καθαρή", value: (r) => r.net, format: "€#,##0.00", width: 14 },
      { header: "ΦΠΑ", value: (r) => r.vat, format: "€#,##0.00", width: 14 },
      { header: "Σύνολο", value: (r) => r.total, format: "€#,##0.00", width: 14 },
    ],
    {
      sheetName: "VAT",
      title: `Σύνοψη ΦΠΑ · ${business?.legalName ?? businessId} · ${from} → ${to}`,
    },
  );

  return xlsxResponse(
    buffer,
    `vat-${business?.vatNumber ?? businessId.slice(-8)}-${from}-${to}.xlsx`,
  );
}

// ─── Annual income ─────────────────────────────────────────────────────
async function annualIncome(businessId: string, yearStr: string) {
  if (!businessId || !yearStr)
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  const year = Number(yearStr);
  if (!Number.isFinite(year))
    return NextResponse.json({ error: "bad year" }, { status: 400 });

  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31, 23, 59, 59);

  const [incomeAgg, expenseAgg, byMonth, business] = await Promise.all([
    prisma.document.aggregate({
      where: {
        businessId,
        status: "issued",
        issueDate: { gte: from, lte: to },
      },
      _sum: {
        netTotalAmount: true,
        vatTotalAmount: true,
        totalAmount: true,
      },
    }),
    prisma.expense.aggregate({
      where: { businessId, issueDate: { gte: from, lte: to } },
      _sum: { netAmount: true, vatAmount: true, totalAmount: true },
    }),
    prisma.$queryRawUnsafe<
      Array<{
        month: string;
        income: number;
        vat_out: number;
        expenses: number;
        vat_in: number;
      }>
    >(
      `SELECT DATE_FORMAT(m.d, '%Y-%m') AS month,
              COALESCE(SUM(CASE WHEN d.status = 'issued' THEN d.netTotalAmount END), 0) AS income,
              COALESCE(SUM(CASE WHEN d.status = 'issued' THEN d.vatTotalAmount END), 0) AS vat_out,
              COALESCE(SUM(e.netAmount), 0) AS expenses,
              COALESCE(SUM(e.vatAmount), 0) AS vat_in
       FROM (
         SELECT DATE_FORMAT(?, '%Y-%m-01') + INTERVAL n MONTH AS d
         FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
               UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
               UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) x
       ) m
       LEFT JOIN documents d ON d.businessId = ?
         AND DATE_FORMAT(d.issueDate, '%Y-%m') = DATE_FORMAT(m.d, '%Y-%m')
       LEFT JOIN expenses e ON e.businessId = ?
         AND DATE_FORMAT(e.issueDate, '%Y-%m') = DATE_FORMAT(m.d, '%Y-%m')
       GROUP BY month
       ORDER BY month ASC`,
      from,
      businessId,
      businessId,
    ),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { legalName: true, vatNumber: true },
    }),
  ]);

  const summary = [
    {
      label: `Έσοδα (καθαρά) · ${year}`,
      value: Number(incomeAgg._sum.netTotalAmount ?? 0),
    },
    {
      label: `ΦΠΑ εξερχόμενο · ${year}`,
      value: Number(incomeAgg._sum.vatTotalAmount ?? 0),
    },
    {
      label: `Έξοδα (καθαρά) · ${year}`,
      value: Number(expenseAgg._sum.netAmount ?? 0),
    },
    {
      label: `ΦΠΑ εισερχόμενο · ${year}`,
      value: Number(expenseAgg._sum.vatAmount ?? 0),
    },
    {
      label: `Καθαρό αποτέλεσμα · ${year}`,
      value:
        Number(incomeAgg._sum.netTotalAmount ?? 0) -
        Number(expenseAgg._sum.netAmount ?? 0),
    },
    {
      label: `ΦΠΑ προς απόδοση · ${year}`,
      value:
        Number(incomeAgg._sum.vatTotalAmount ?? 0) -
        Number(expenseAgg._sum.vatAmount ?? 0),
    },
  ];

  const rows = [
    ...summary.map((s) => ({ month: s.label, ...zeroMonth(), summary: s.value })),
    ...byMonth.map((m) => ({
      month: m.month,
      income: Number(m.income),
      vat_out: Number(m.vat_out),
      expenses: Number(m.expenses),
      vat_in: Number(m.vat_in),
      summary: null as number | null,
    })),
  ];

  const buffer = await toXlsxBuffer(
    rows,
    [
      { header: "Περίοδος", value: (r) => r.month, width: 22 },
      { header: "Έσοδα", value: (r) => r.income, format: "€#,##0.00", width: 14 },
      { header: "ΦΠΑ έσοδα", value: (r) => r.vat_out, format: "€#,##0.00", width: 14 },
      { header: "Έξοδα", value: (r) => r.expenses, format: "€#,##0.00", width: 14 },
      { header: "ΦΠΑ έξοδα", value: (r) => r.vat_in, format: "€#,##0.00", width: 14 },
      { header: "Σύνολο (για summary)", value: (r) => r.summary, format: "€#,##0.00", width: 20 },
    ],
    {
      sheetName: `Έτος ${year}`,
      title: `Ετήσια σύνοψη · ${business?.legalName ?? businessId} · ${year}`,
    },
  );

  return xlsxResponse(
    buffer,
    `annual-${business?.vatNumber ?? businessId.slice(-8)}-${year}.xlsx`,
  );
}

function zeroMonth() {
  return { income: 0, vat_out: 0, expenses: 0, vat_in: 0 };
}

// ─── Platform margin ────────────────────────────────────────────────────
async function platformMargin(from: string, to: string) {
  if (!from || !to)
    return NextResponse.json({ error: "missing params" }, { status: 400 });

  const invoices = await prisma.platformInvoice.findMany({
    where: {
      status: "issued",
      issueDate: {
        gte: new Date(from),
        lte: new Date(to + "T23:59:59"),
      },
    },
    include: {
      business: { select: { legalName: true, vatNumber: true } },
    },
    take: 5000,
  });

  const buffer = await toXlsxBuffer(
    invoices.map((i) => ({
      date: i.issueDate,
      businessName: i.business.legalName,
      vat: i.business.vatNumber,
      description: i.description,
      total: Number(i.totalAmount),
      cost: Number(i.providerCost),
      margin: Number(i.margin),
      marginPct:
        Number(i.totalAmount) > 0
          ? (Number(i.margin) / Number(i.totalAmount)) * 100
          : 0,
    })),
    [
      { header: "Ημ/νία", value: (r) => r.date, format: "yyyy-mm-dd", width: 12 },
      { header: "Επιχείρηση", value: (r) => r.businessName, width: 32 },
      { header: "ΑΦΜ", value: (r) => r.vat, width: 12 },
      { header: "Περιγραφή", value: (r) => r.description, width: 32 },
      { header: "Έσοδα", value: (r) => r.total, format: "€#,##0.00", width: 14 },
      { header: "Κόστος", value: (r) => r.cost, format: "€#,##0.00", width: 14 },
      { header: "Περιθώριο", value: (r) => r.margin, format: "€#,##0.00", width: 14 },
      { header: "Περιθώριο %", value: (r) => r.marginPct, format: "0.0%", width: 14 },
    ],
    {
      sheetName: "Margin",
      title: `Περιθώριο πλατφόρμας · ${from} → ${to}`,
    },
  );

  return xlsxResponse(buffer, `platform-margin-${from}-${to}.xlsx`);
}
