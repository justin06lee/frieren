"use client";

import { useState } from "react";

export default function CloneBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const cmd = `git clone ${url}`;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(cmd).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title="copy clone command"
      className="group flex max-w-full items-center gap-3 border border-line bg-panel px-3 py-1.5 text-left font-mono text-xs text-fog transition-colors hover:border-frost/60"
    >
      <span className="truncate">{cmd}</span>
      <span className={copied ? "text-frost" : "text-dim group-hover:text-frost"}>
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}
