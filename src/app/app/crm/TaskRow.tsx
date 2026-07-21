"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Clock, User } from "lucide-react";
import { toggleTaskDoneAction, deleteTaskAction } from "./actions";

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskRow({
  task,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    dueAt: string | null;
    reminderAt: string | null;
    assignee: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTx] = useTransition();
  const isDone = task.status === "done";

  function toggle() {
    const fd = new FormData();
    fd.set("id", task.id);
    startTx(async () => {
      await toggleTaskDoneAction(fd);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Διαγραφή "${task.title}";`)) return;
    const fd = new FormData();
    fd.set("id", task.id);
    startTx(async () => {
      await deleteTaskAction(fd);
      router.refresh();
    });
  }

  const dueText = fmt(task.dueAt);
  const now = Date.now();
  const overdue =
    !isDone && task.dueAt && new Date(task.dueAt).getTime() < now;

  return (
    <li className={"flex items-start gap-3 px-6 py-4 " + (pending ? "opacity-50" : "")}>
      <input
        type="checkbox"
        checked={isDone}
        onChange={toggle}
        disabled={pending}
        className="mt-1 h-5 w-5 cursor-pointer rounded border-ink-500 text-brand-700"
      />
      <div className="flex-1">
        <p
          className={
            "text-sm font-semibold " +
            (isDone ? "text-ink-500 line-through" : "text-brand-900")
          }
        >
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 text-xs text-ink-700 line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
          {dueText && (
            <span
              className={
                "inline-flex items-center gap-1 " +
                (overdue ? "font-bold text-red-700" : "text-ink-500")
              }
            >
              <Clock size={12} /> {dueText}
            </span>
          )}
          {task.assignee && (
            <span className="inline-flex items-center gap-1 text-ink-500">
              <User size={12} /> {task.assignee}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="text-ink-400 hover:text-red-700"
        aria-label="Διαγραφή"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
