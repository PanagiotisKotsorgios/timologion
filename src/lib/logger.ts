import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Structured logger with optional Sentry forwarding + in-app error log.
 *
 * Sentry is only initialized when `SENTRY_DSN` is set; otherwise this module
 * degrades to console output (production) or console.log (development).
 * In production, warn/error calls also persist to the `error_logs` table
 * so the admin dashboard at /admin/errors can group and count them without
 * a third-party dependency.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = {
  userId?: string | null;
  businessId?: string | null;
  action?: string;
  [key: string]: unknown;
};

type SentryClient = {
  captureException(err: unknown, context?: unknown): void;
  captureMessage(msg: string, level: LogLevel, context?: unknown): void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sentryClient: SentryClient | null = null;
let sentryInitAttempted = false;

async function initSentry(): Promise<SentryClient | null> {
  if (sentryInitAttempted) return sentryClient;
  sentryInitAttempted = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    // Dynamic import so the SDK isn't a hard dependency. Any errors during
    // initialization degrade gracefully — logging still works via console.
    // The literal string prevents TypeScript from requiring the package at
    // build time when it isn't installed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import(/* @vite-ignore */ "@sentry/nextjs" as string).catch(
      () => null,
    )) as any;
    if (!mod?.init) return null;
    mod.init({
      dsn,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
      release: process.env.APP_RELEASE,
    });
    sentryClient = {
      captureException: (err, context) => mod.captureException(err, context),
      captureMessage: (msg, level, context) =>
        mod.captureMessage(msg, { level, extra: context }),
    };
  } catch {
    sentryClient = null;
  }
  return sentryClient;
}

function emit(level: LogLevel, msg: string, ctx?: LogContext) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...ctx,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

export const logger = {
  debug(msg: string, ctx?: LogContext) {
    if (env.NODE_ENV !== "production") emit("debug", msg, ctx);
  },
  info(msg: string, ctx?: LogContext) {
    emit("info", msg, ctx);
  },
  warn(msg: string, ctx?: LogContext) {
    emit("warn", msg, ctx);
    void persistErrorLog("warn", msg, undefined, ctx);
    void initSentry().then((c) => c?.captureMessage(msg, "warn", ctx));
  },
  error(msg: string, err?: unknown, ctx?: LogContext) {
    emit("error", msg, { ...ctx, error: serializeError(err) });
    void persistErrorLog("error", msg, err, ctx);
    void initSentry().then((c) => {
      if (err) c?.captureException(err, ctx);
      else c?.captureMessage(msg, "error", ctx);
    });
  },
};

/**
 * Persist warn/error events to the ErrorLog table so support can see
 * them in /admin/errors. Best-effort — if the DB is the thing that
 * broke, we just swallow it (already emitted to console).
 *
 * fingerprint = first line of stack + message. Same underlying bug
 * across many requests collapses to one row per admin view instead of
 * flooding the list.
 */
async function persistErrorLog(
  level: "warn" | "error",
  msg: string,
  err: unknown,
  ctx?: LogContext,
): Promise<void> {
  if (env.NODE_ENV !== "production") return;
  try {
    const { prisma } = await import("@/lib/db");
    const stackStr =
      err instanceof Error ? err.stack ?? err.message : undefined;
    const firstStackLine = stackStr?.split("\n").find((l) => l.trim().startsWith("at "))?.trim() ?? "";
    const fingerprint = createHash("sha256")
      .update(`${msg}|${firstStackLine}`)
      .digest("hex")
      .slice(0, 32);
    const path =
      typeof ctx?.path === "string"
        ? ctx.path
        : typeof ctx?.route === "string"
          ? ctx.route
          : undefined;
    const {
      userId: _u,
      businessId: _b,
      action: _a,
      path: _p,
      route: _r,
      ...rest
    } = ctx ?? {};
    // Silence "declared but unused" — we only spread the remainder.
    void _u; void _b; void _a; void _p; void _r;
    const metaKeys = Object.keys(rest);
    await prisma.errorLog.create({
      data: {
        level,
        message: msg.slice(0, 500),
        fingerprint,
        stack: stackStr?.slice(0, 8000) ?? null,
        path: path?.slice(0, 500) ?? null,
        userId: typeof ctx?.userId === "string" ? ctx.userId : null,
        businessId:
          typeof ctx?.businessId === "string" ? ctx.businessId : null,
        meta: metaKeys.length > 0 ? JSON.stringify(rest).slice(0, 8000) : null,
      },
    });
  } catch {
    // Best-effort. Console already has the record.
  }
}

function serializeError(err: unknown): unknown {
  if (!err) return undefined;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return err;
}
