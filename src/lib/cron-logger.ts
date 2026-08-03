import "server-only";
import { prisma } from "@/lib/db";

/**
 * Wrap a cron handler with a CronRun DB record. The endpoint receives
 * the finished CronRun row so it can emit its own response; the
 * runtime doesn't care about the shape of the returned value.
 */
export async function withCronLog<T>(
  jobKey: string,
  work: () => Promise<{ result: T; itemsDone?: number }>,
): Promise<{ ok: true; runId: string; result: T } | { ok: false; error: string }> {
  const started = Date.now();
  const run = await prisma.cronRun.create({
    data: { jobKey, status: "running", startedAt: new Date(started) },
  });
  try {
    const { result, itemsDone = 0 } = await work();
    await prisma.cronRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        itemsDone,
        durationMs: Date.now() - started,
        finishedAt: new Date(),
      },
    });
    return { ok: true, runId: run.id, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.cronRun
      .update({
        where: { id: run.id },
        data: {
          status: "failed",
          durationMs: Date.now() - started,
          finishedAt: new Date(),
          error: message.slice(0, 8000),
        },
      })
      .catch(() => undefined);
    return { ok: false, error: message };
  }
}
