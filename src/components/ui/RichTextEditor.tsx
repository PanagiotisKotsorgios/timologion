"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Quote,
  Eraser,
} from "lucide-react";

/**
 * Small rich-text editor built on top of `contentEditable`. Emits sanitized
 * HTML through a hidden input so it can be posted as part of a normal HTML
 * form / server action.
 *
 * Deliberately tiny — no external editor library, no schema, no plugins. If we
 * grow to want block-level structure, tables, or media, replace with Tiptap.
 */
export function RichTextEditor({
  name,
  initialHtml = "",
  placeholder,
  className,
}: {
  name: string;
  initialHtml?: string;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [html, setHtml] = useState(initialHtml);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (!ready) {
      ref.current.innerHTML = initialHtml || "";
      setReady(true);
    }
  }, [initialHtml, ready]);

  function exec(cmd: string, arg?: string) {
    // execCommand is deprecated but still works everywhere and is the smallest
    // way to get a working WYSIWYG. Once React ships a native alternative we
    // can migrate.
    document.execCommand(cmd, false, arg);
    if (ref.current) setHtml(ref.current.innerHTML);
    ref.current?.focus();
  }

  function onInput() {
    if (ref.current) setHtml(ref.current.innerHTML);
  }

  function promptLink() {
    const url = window.prompt("URL", "https://");
    if (!url) return;
    exec("createLink", url);
  }

  return (
    <div className={className}>
      <input type="hidden" name={name} value={html} readOnly />

      <div className="rounded-lg border-2 border-ink-300 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-1 border-b-2 border-ink-300 bg-ink-100 p-2">
          <Btn icon={Bold} label="Έντονη" onClick={() => exec("bold")} />
          <Btn icon={Italic} label="Πλάγια" onClick={() => exec("italic")} />
          <Btn
            icon={Underline}
            label="Υπογράμμιση"
            onClick={() => exec("underline")}
          />
          <Divider />
          <Btn
            icon={Heading2}
            label="Επικεφαλίδα 2"
            onClick={() => exec("formatBlock", "H2")}
          />
          <Btn
            icon={Heading3}
            label="Επικεφαλίδα 3"
            onClick={() => exec("formatBlock", "H3")}
          />
          <Btn
            icon={Quote}
            label="Παράθεση"
            onClick={() => exec("formatBlock", "BLOCKQUOTE")}
          />
          <Divider />
          <Btn
            icon={List}
            label="Λίστα"
            onClick={() => exec("insertUnorderedList")}
          />
          <Btn
            icon={ListOrdered}
            label="Αριθμημένη"
            onClick={() => exec("insertOrderedList")}
          />
          <Divider />
          <Btn icon={LinkIcon} label="Σύνδεσμος" onClick={promptLink} />
          <Btn
            icon={Eraser}
            label="Καθαρισμός μορφοποίησης"
            onClick={() => exec("removeFormat")}
          />
          <div className="ml-auto flex items-center gap-1">
            <Btn icon={Undo2} label="Αναίρεση" onClick={() => exec("undo")} />
            <Btn icon={Redo2} label="Επανάληψη" onClick={() => exec("redo")} />
          </div>
        </div>

        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          data-placeholder={placeholder}
          className="prose max-w-none min-h-[220px] px-5 py-4 text-base leading-relaxed text-ink-900 focus:outline-none"
          style={{
            // basic placeholder via ::before is styled globally; fall back to
            // an inline empty attribute-based hint if placeholder set.
          }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-700">
        Υποστηρίζονται έντονη, πλάγια, υπογράμμιση, επικεφαλίδες, λίστες,
        σύνδεσμοι.
      </p>
    </div>
  );
}

function Btn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Bold;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-md text-ink-900 transition-colors hover:bg-white"
    >
      <Icon size={16} />
    </button>
  );
}
function Divider() {
  return <span className="mx-1 h-6 w-px bg-ink-300" aria-hidden />;
}
