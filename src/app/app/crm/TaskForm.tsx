"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { saveTaskAction } from "./actions";

export function TaskForm({
  assignees,
}: {
  assignees: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    { error?: string } | null,
    FormData
  >(async (_prev, fd) => {
    const res = await saveTaskAction(fd);
    if (res.ok) {
      router.refresh();
      const form = document.querySelector<HTMLFormElement>(
        `form[data-form="task"]`,
      );
      form?.reset();
      return null;
    }
    return { error: res.error };
  }, null);

  return (
    <form action={formAction} data-form="task" className="space-y-3">
      {state?.error && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <Field label="Τίτλος" htmlFor="title">
        <Input id="title" name="title" required maxLength={200} />
      </Field>
      <Field label="Περιγραφή" htmlFor="description">
        <Textarea id="description" name="description" rows={2} maxLength={5000} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Λήξη" htmlFor="dueAt">
          <Input id="dueAt" name="dueAt" type="datetime-local" />
        </Field>
        <Field label="Υπενθύμιση" htmlFor="reminderAt">
          <Input id="reminderAt" name="reminderAt" type="datetime-local" />
        </Field>
      </div>
      <Field label="Ανάθεση" htmlFor="assigneeId">
        <Select id="assigneeId" name="assigneeId" defaultValue="">
          <option value="">— Χωρίς ανάθεση —</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.fullName}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex justify-end">
        <Button type="submit" icon={Plus} disabled={pending}>
          {pending ? "Δημιουργία..." : "Δημιουργία"}
        </Button>
      </div>
    </form>
  );
}
