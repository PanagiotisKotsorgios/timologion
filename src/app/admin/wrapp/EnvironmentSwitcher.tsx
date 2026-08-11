"use client";

import { useTransition } from "react";
import { AlertTriangle, CheckCircle2, Rocket, Beaker } from "lucide-react";
import {
  switchToProductionAction,
  switchToStagingAction,
} from "./actions";
import type { WrappEnvironment } from "@/lib/wrapp/settings";

/**
 * Single-purpose card for switching the effective Wrapp base URL between
 * staging and production. The base URL is the ONLY thing this touches;
 * the partner API key is preserved because staging and production use
 * different keys and swapping them silently would produce cryptic 401s.
 * The admin still confirms the switch (double-click gate) and then
 * pastes the counterpart key into the settings form below.
 */
export function EnvironmentSwitcher({
  current,
  baseUrl,
}: {
  current: WrappEnvironment;
  baseUrl: string;
}) {
  const [pending, start] = useTransition();

  const isProd = current === "production";
  const isStaging = current === "staging";

  return (
    <div className="rounded-2xl border-2 border-ink-200 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-ink-500">
            Περιβάλλον
          </p>
          <h3 className="mt-1 text-xl font-extrabold text-brand-900">
            Μετάβαση σε παραγωγή ή staging
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-ink-700">
            Επιλέγει μόνο το base URL. Το partner API key <strong>δεν</strong> αλλάζει
            αυτόματα — staging και production έχουν διαφορετικά κλειδιά. Μετά
            την αλλαγή, επικόλλησε το νέο κλειδί στο πεδίο «Partner API key»
            και αποθήκευσε.
          </p>
          <p className="mt-2 break-all text-xs text-ink-500">
            Ενεργό URL:{" "}
            <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono">
              {baseUrl}
            </code>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-full border-2 border-ink-200 bg-ink-50 px-3 py-1.5">
          {isProd ? (
            <>
              <CheckCircle2 size={14} className="text-emerald-600" aria-hidden />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-800">
                Παραγωγή
              </span>
            </>
          ) : isStaging ? (
            <>
              <AlertTriangle size={14} className="text-amber-600" aria-hidden />
              <span className="text-xs font-black uppercase tracking-widest text-amber-800">
                Staging
              </span>
            </>
          ) : (
            <span className="text-xs font-black uppercase tracking-widest text-ink-700">
              Custom
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SwitchButton
          icon={Rocket}
          title="Παραγωγή"
          subtitle="https://wrapp.ai/api/v1"
          active={isProd}
          tone="prod"
          disabled={pending || isProd}
          onClick={() => {
            if (
              !confirm(
                "Ενεργοποίηση παραγωγικού Wrapp; Οι επόμενες εκδόσεις θα φτάσουν σε πραγματικά myDATA παραστατικά.",
              )
            )
              return;
            start(async () => {
              await switchToProductionAction();
            });
          }}
        />
        <SwitchButton
          icon={Beaker}
          title="Staging"
          subtitle="https://staging.wrapp.ai/api/v1"
          active={isStaging}
          tone="staging"
          disabled={pending || isStaging}
          onClick={() => {
            if (
              !confirm(
                "Επαναφορά σε staging; Οι εκδόσεις δεν θα φτάνουν σε πραγματικό myDATA.",
              )
            )
              return;
            start(async () => {
              await switchToStagingAction();
            });
          }}
        />
      </div>
    </div>
  );
}

function SwitchButton({
  icon: Icon,
  title,
  subtitle,
  active,
  tone,
  disabled,
  onClick,
}: {
  icon: typeof Rocket;
  title: string;
  subtitle: string;
  active: boolean;
  tone: "prod" | "staging";
  disabled: boolean;
  onClick: () => void;
}) {
  const activeClass =
    tone === "prod"
      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
      : "border-amber-500 bg-amber-50 text-amber-900";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "group flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors " +
        (active
          ? activeClass + " cursor-default"
          : "border-ink-200 bg-white hover:border-brand-900 hover:bg-brand-50 disabled:opacity-60")
      }
    >
      <span
        className={
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl " +
          (active
            ? tone === "prod"
              ? "bg-emerald-500 text-white"
              : "bg-amber-500 text-white"
            : "bg-ink-100 text-ink-700 group-hover:bg-brand-900 group-hover:text-white")
        }
      >
        <Icon size={20} strokeWidth={2.5} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-black">{title}</span>
        <span className="truncate text-xs opacity-70">{subtitle}</span>
        {active && (
          <span className="mt-0.5 text-[11px] font-bold uppercase tracking-wider">
            Ενεργό
          </span>
        )}
      </span>
    </button>
  );
}
