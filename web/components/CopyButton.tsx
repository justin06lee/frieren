"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

// Copies text and says so for a moment. Falls back silently when the
// clipboard isn't available (an insecure origin, say).
export default function CopyButton({
  value,
  label = "Copy",
  className = "",
  showLabel = false,
}: {
  value: string;
  label?: string;
  className?: string;
  showLabel?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          /* no clipboard — the text is on screen anyway */
        }
      }}
      className={`inline-flex items-center gap-1.5 text-mute transition-colors hover:text-ink ${className}`}
    >
      {copied ? <CheckIcon className="h-4 w-4 text-green" /> : <CopyIcon className="h-4 w-4" />}
      {showLabel && <span className="text-xs">{copied ? "Copied" : label}</span>}
    </button>
  );
}
