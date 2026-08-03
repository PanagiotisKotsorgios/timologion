import "server-only";
import { prisma } from "@/lib/db";
import { toXlsxBuffer, type XlsxColumn } from "@/lib/xlsx";

/**
 * Central registry of admin XLSX exports. Every entry is:
 *   - `fetch(params)` — a filter-aware query
 *   - `columns` — column definitions passed straight to toXlsxBuffer
 *   - `filename(params)` — outbound filename, timestamped
 *
 * A single /api/admin/export/[entity] route dispatches through this map,
 * so adding a new export = one entry here.
 */

export type ExportParams = URLSearchParams;

// Row helpers — every fetch returns Row<T> from a Prisma model.
type Registry = {
  [key: string]: ExportDef<unknown>;
};

type ExportDef<T> = {
  fetch(params: ExportParams): Promise<T[]>;
  columns: XlsxColumn<T>[];
  sheet: string;
  filename(params: ExportParams): string;
};

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── businesses ─────────────────────────────────────────────────────────
type BusinessRow = {
  id: string;
  legalName: string;
  tradeName: string | null;
  vatNumber: string;
  city: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  suspendedAt: Date | null;
  supportTags: string | null;
  createdAt: Date;
  _count: { members: number; documents: number };
};

const businesses: ExportDef<BusinessRow> = {
  fetch: async (params) => {
    const q = params.get("q")?.trim() ?? "";
    return prisma.business.findMany({
      where: q
        ? {
            OR: [
              { legalName: { contains: q } },
              { vatNumber: { contains: q } },
              { tradeName: { contains: q } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        vatNumber: true,
        city: true,
        country: true,
        email: true,
        phone: true,
        suspendedAt: true,
        supportTags: true,
        createdAt: true,
        _count: { select: { members: true, documents: true } },
      },
    });
  },
  columns: [
    { header: "ID", value: (r) => r.id, width: 26 },
    { header: "Νόμιμη επωνυμία", value: (r) => r.legalName, width: 32 },
    { header: "Διακριτικός", value: (r) => r.tradeName ?? "", width: 28 },
    { header: "ΑΦΜ", value: (r) => r.vatNumber, width: 12 },
    { header: "Πόλη", value: (r) => r.city ?? "", width: 16 },
    { header: "Χώρα", value: (r) => r.country, width: 8 },
    { header: "Email", value: (r) => r.email ?? "", width: 30 },
    { header: "Τηλέφωνο", value: (r) => r.phone ?? "", width: 16 },
    { header: "Μέλη", value: (r) => r._count.members, width: 8 },
    { header: "Παραστ.", value: (r) => r._count.documents, width: 10 },
    { header: "Tags", value: (r) => r.supportTags ?? "", width: 20 },
    {
      header: "Suspended",
      value: (r) => r.suspendedAt ?? "",
      format: "yyyy-mm-dd",
      width: 14,
    },
    {
      header: "Ημ/νία εγγραφής",
      value: (r) => r.createdAt,
      format: "yyyy-mm-dd hh:mm",
      width: 18,
    },
  ],
  sheet: "Businesses",
  filename: () => `businesses-${stamp()}.xlsx`,
};

// ─── users ──────────────────────────────────────────────────────────────
type UserRow = {
  id: string;
  email: string;
  fullName: string;
  emailVerifiedAt: Date | null;
  platformRole: string | null;
  suspendedAt: Date | null;
  mfaEnabled: boolean;
  createdAt: Date;
};

const users: ExportDef<UserRow> = {
  fetch: async (params) => {
    const q = params.get("q")?.trim() ?? "";
    return prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q } },
              { fullName: { contains: q } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        emailVerifiedAt: true,
        platformRole: true,
        suspendedAt: true,
        mfaEnabled: true,
        createdAt: true,
      },
    });
  },
  columns: [
    { header: "ID", value: (r) => r.id, width: 26 },
    { header: "Email", value: (r) => r.email, width: 30 },
    { header: "Ονοματεπώνυμο", value: (r) => r.fullName, width: 28 },
    {
      header: "Επαλήθευση email",
      value: (r) => r.emailVerifiedAt ?? "",
      format: "yyyy-mm-dd",
      width: 14,
    },
    { header: "Platform role", value: (r) => r.platformRole ?? "", width: 14 },
    { header: "2FA", value: (r) => (r.mfaEnabled ? "Ναι" : "Όχι"), width: 8 },
    {
      header: "Suspended",
      value: (r) => r.suspendedAt ?? "",
      format: "yyyy-mm-dd",
      width: 14,
    },
    {
      header: "Εγγραφή",
      value: (r) => r.createdAt,
      format: "yyyy-mm-dd hh:mm",
      width: 18,
    },
  ],
  sheet: "Users",
  filename: () => `users-${stamp()}.xlsx`,
};

// ─── documents (all businesses) ────────────────────────────────────────
type DocumentRow = {
  id: string;
  type: string;
  status: string;
  series: string | null;
  number: number | null;
  issueDate: Date;
  totalAmount: unknown;
  business: { legalName: string; vatNumber: string };
  client: { legalName: string } | null;
};

const documents: ExportDef<DocumentRow> = {
  fetch: async (params) => {
    const status = params.get("status") ?? undefined;
    const q = params.get("q")?.trim() ?? "";
    return prisma.document.findMany({
      where: {
        ...(status ? { status: status as "issued" } : {}),
        ...(q
          ? {
              OR: [
                { business: { legalName: { contains: q } } },
                { business: { vatNumber: { contains: q } } },
                { client: { legalName: { contains: q } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        id: true,
        type: true,
        status: true,
        series: true,
        number: true,
        issueDate: true,
        totalAmount: true,
        business: { select: { legalName: true, vatNumber: true } },
        client: { select: { legalName: true } },
      },
    }) as unknown as Promise<DocumentRow[]>;
  },
  columns: [
    { header: "ID", value: (r) => r.id, width: 26 },
    { header: "Ημ/νία", value: (r) => r.issueDate, format: "yyyy-mm-dd", width: 12 },
    { header: "Επιχείρηση", value: (r) => r.business.legalName, width: 28 },
    { header: "ΑΦΜ", value: (r) => r.business.vatNumber, width: 12 },
    { header: "Πελάτης", value: (r) => r.client?.legalName ?? "", width: 28 },
    { header: "Τύπος", value: (r) => r.type, width: 22 },
    { header: "Σειρά", value: (r) => r.series ?? "", width: 8 },
    { header: "Αριθμός", value: (r) => r.number ?? "", width: 10 },
    { header: "Κατάσταση", value: (r) => r.status, width: 12 },
    {
      header: "Σύνολο",
      value: (r) => r.totalAmount as unknown as number,
      format: "€#,##0.00",
      width: 14,
    },
  ],
  sheet: "Documents",
  filename: () => `documents-${stamp()}.xlsx`,
};

// ─── audit log ──────────────────────────────────────────────────────────
type AuditRow = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  userId: string | null;
  businessId: string | null;
  createdAt: Date;
};

const audit: ExportDef<AuditRow> = {
  fetch: async (params) => {
    const q = params.get("q")?.trim() ?? "";
    return prisma.auditLog.findMany({
      where: q ? { action: { contains: q } } : {},
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        userId: true,
        businessId: true,
        createdAt: true,
      },
    });
  },
  columns: [
    { header: "Ημ/νία", value: (r) => r.createdAt, format: "yyyy-mm-dd hh:mm:ss", width: 20 },
    { header: "Action", value: (r) => r.action, width: 34 },
    { header: "Entity", value: (r) => r.entityType ?? "", width: 16 },
    { header: "Entity ID", value: (r) => r.entityId ?? "", width: 26 },
    { header: "User ID", value: (r) => r.userId ?? "", width: 26 },
    { header: "Business ID", value: (r) => r.businessId ?? "", width: 26 },
  ],
  sheet: "Audit",
  filename: () => `audit-${stamp()}.xlsx`,
};

// ─── errors ─────────────────────────────────────────────────────────────
type ErrorRow = {
  id: string;
  level: string;
  message: string;
  path: string | null;
  businessId: string | null;
  fingerprint: string;
  createdAt: Date;
};

const errors: ExportDef<ErrorRow> = {
  fetch: async (params) => {
    const level = params.get("level") as "warn" | "error" | null;
    return prisma.errorLog.findMany({
      where: { ...(level ? { level } : {}) },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        id: true,
        level: true,
        message: true,
        path: true,
        businessId: true,
        fingerprint: true,
        createdAt: true,
      },
    });
  },
  columns: [
    { header: "Ημ/νία", value: (r) => r.createdAt, format: "yyyy-mm-dd hh:mm:ss", width: 20 },
    { header: "Level", value: (r) => r.level, width: 10 },
    { header: "Message", value: (r) => r.message, width: 60 },
    { header: "Path", value: (r) => r.path ?? "", width: 30 },
    { header: "Business", value: (r) => r.businessId ?? "", width: 26 },
    { header: "Fingerprint", value: (r) => r.fingerprint, width: 20 },
  ],
  sheet: "Errors",
  filename: () => `errors-${stamp()}.xlsx`,
};

// ─── webhooks ───────────────────────────────────────────────────────────
type WebhookRow = {
  id: string;
  eventType: string | null;
  outcome: string;
  hasSignature: boolean;
  verificationScope: string | null;
  partnerUserId: string | null;
  detail: string | null;
  createdAt: Date;
};

const webhooks: ExportDef<WebhookRow> = {
  fetch: async () =>
    prisma.wrappWebhookLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        id: true,
        eventType: true,
        outcome: true,
        hasSignature: true,
        verificationScope: true,
        partnerUserId: true,
        detail: true,
        createdAt: true,
      },
    }),
  columns: [
    { header: "Ημ/νία", value: (r) => r.createdAt, format: "yyyy-mm-dd hh:mm:ss", width: 20 },
    { header: "Event", value: (r) => r.eventType ?? "", width: 22 },
    { header: "Outcome", value: (r) => r.outcome, width: 18 },
    { header: "Sig", value: (r) => (r.hasSignature ? "Ναι" : "Όχι"), width: 8 },
    { header: "Scope", value: (r) => r.verificationScope ?? "", width: 12 },
    { header: "Partner user", value: (r) => r.partnerUserId ?? "", width: 28 },
    { header: "Detail", value: (r) => r.detail ?? "", width: 60 },
  ],
  sheet: "Webhooks",
  filename: () => `wrapp-webhooks-${stamp()}.xlsx`,
};

// ─── backups ────────────────────────────────────────────────────────────
type BackupRow = {
  id: string;
  status: string;
  target: string;
  bytes: bigint;
  durationMs: number;
  startedAt: Date;
  finishedAt: Date | null;
};

const backups: ExportDef<BackupRow> = {
  fetch: async () =>
    prisma.backupRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 5000,
      select: {
        id: true,
        status: true,
        target: true,
        bytes: true,
        durationMs: true,
        startedAt: true,
        finishedAt: true,
      },
    }),
  columns: [
    { header: "Ξεκίνησε", value: (r) => r.startedAt, format: "yyyy-mm-dd hh:mm:ss", width: 20 },
    { header: "Τέλος", value: (r) => r.finishedAt ?? "", format: "yyyy-mm-dd hh:mm:ss", width: 20 },
    { header: "Κατάσταση", value: (r) => r.status, width: 12 },
    { header: "Bytes", value: (r) => Number(r.bytes), format: "#,##0", width: 16 },
    { header: "Διάρκεια (ms)", value: (r) => r.durationMs, format: "#,##0", width: 14 },
    { header: "Target", value: (r) => r.target, width: 60 },
  ],
  sheet: "Backups",
  filename: () => `backups-${stamp()}.xlsx`,
};

export const EXPORT_REGISTRY: Registry = {
  businesses: businesses as ExportDef<unknown>,
  users: users as ExportDef<unknown>,
  documents: documents as ExportDef<unknown>,
  audit: audit as ExportDef<unknown>,
  errors: errors as ExportDef<unknown>,
  webhooks: webhooks as ExportDef<unknown>,
  backups: backups as ExportDef<unknown>,
};

export async function runExport(
  entity: string,
  params: ExportParams,
): Promise<{ buffer: Buffer; filename: string } | null> {
  const def = EXPORT_REGISTRY[entity];
  if (!def) return null;
  const rows = await def.fetch(params);
  const buffer = await toXlsxBuffer(rows, def.columns, {
    sheetName: def.sheet,
    title: `${def.sheet} · ${new Date().toLocaleString("el-GR")}`,
  });
  return { buffer, filename: def.filename(params) };
}
