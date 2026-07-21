import "server-only";
import { env } from "@/lib/env";

/**
 * Structured logger with optional Sentry forwarding.
 *
 * Sentry is only initialized when `SENTRY_DSN` is set; otherwise this module
 * degrades to console output (production) or console.log (development).
 * The interface is deliberately narrow so we can swap in a full SDK later
 * without touching call sites.
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
    void initSentry().then((c) => c?.captureMessage(msg, "warn", ctx));
  },
  error(msg: string, err?: unknown, ctx?: LogContext) {
    emit("error", msg, { ...ctx, error: serializeError(err) });
    void initSentry().then((c) => {
      if (err) c?.captureException(err, ctx);
      else c?.captureMessage(msg, "error", ctx);
    });
  },
};

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
