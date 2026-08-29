"use client";

import { useEffect, useRef, useState } from "react";
import CopyButton from "./CopyButton";
import { ChevronDownIcon, CodeIcon, DownloadIcon } from "./icons";
import { btnPrimary } from "./ui";

// GitHub's green "Code" button: the clone URL, ready to copy, plus a link to
// the raw archive endpoint for people who just want a file.
export default function CloneMenu({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={btnPrimary}
      >
        <CodeIcon className="h-4 w-4" />
        Code
        <ChevronDownIcon className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[336px] rounded-md border border-line bg-raised p-4 shadow-xl shadow-black/40">
          <p className="text-sm font-semibold">Clone</p>
          <p className="mt-1 text-xs text-mute">
            Anyone who can reach this repository can clone it.
          </p>

          <div className="mt-3 flex items-center gap-2 rounded-md border border-line bg-inset px-2 py-1.5">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Clone URL"
              className="min-w-0 flex-1 bg-transparent font-mono text-xs text-ink outline-none"
            />
            <CopyButton value={url} label="Copy clone URL" />
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-hair pt-3 text-xs text-mute">
            <DownloadIcon className="h-4 w-4" />
            <code className="font-mono">git clone {url}</code>
          </div>
        </div>
      )}
    </div>
  );
}
