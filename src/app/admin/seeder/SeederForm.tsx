"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Sprout } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Field, Input } from "@/components/ui/Input";
import { runSeederAction } from "./actions";

export function SeederForm({ blocked }: { blocked: boolean }) {
  const [legalName, setLegalName] = useState("Δοκιμαστική ΕΠΕ");
  const [clientCount, setClientCount] = useState(5);
  const [itemCount, setItemCount] = useState(5);
  const [draftCount, setDraftCount] = useState(3);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; id?: string } | null>(
    null,
  );
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {msg && (
        <Alert tone={msg.ok ? "success" : "danger"}>
          {msg.text}
          {msg.ok && msg.id && (
            <>
              {" "}
              <Link
                href={`/admin/businesses/${msg.id}`}
                className="font-bold underline underline-offset-4"
              >
                Άνοιξε καρτέλα →
              </Link>
            </>
          )}
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Όνομα επιχείρησης" htmlFor="sd-name">
          <Input
            id="sd-name"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            required
          />
        </Field>
        <Field label="Πελάτες" htmlFor="sd-c">
          <Input
            id="sd-c"
            type="number"
            min={0}
            max={50}
            value={clientCount}
            onChange={(e) => setClientCount(Number(e.target.value))}
          />
        </Field>
        <Field label="Είδη" htmlFor="sd-i">
          <Input
            id="sd-i"
            type="number"
            min={0}
            max={50}
            value={itemCount}
            onChange={(e) => setItemCount(Number(e.target.value))}
          />
        </Field>
        <Field label="Πρόχειρα παραστατικά" htmlFor="sd-d">
          <Input
            id="sd-d"
            type="number"
            min={0}
            max={50}
            value={draftCount}
            onChange={(e) => setDraftCount(Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending || blocked}
          onClick={() => {
            const fd = new FormData();
            fd.set("legalName", legalName);
            fd.set("clientCount", String(clientCount));
            fd.set("itemCount", String(itemCount));
            fd.set("draftCount", String(draftCount));
            setMsg(null);
            start(async () => {
              const res = await runSeederAction(fd);
              if (res.ok) setMsg({ ok: true, text: res.summary, id: res.businessId });
              else setMsg({ ok: false, text: res.error });
            });
          }}
          className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-emerald-700 bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          <Sprout size={14} strokeWidth={2.5} aria-hidden />
          {pending ? "Δημιουργία..." : "Δημιουργία demo tenant"}
        </button>
      </div>
    </div>
  );
}
