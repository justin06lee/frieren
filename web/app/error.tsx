"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl border border-line bg-panel px-8 py-10">
      <p className="font-mono text-sm text-gold">❄ the archive is unreachable</p>
      <p className="mt-4 text-sm leading-relaxed text-fog">
        The backend git server didn&apos;t answer. It may be waking up, restarting, or
        offline — the repositories themselves are safe on the owner&apos;s machine.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 border border-line px-4 py-1.5 font-mono text-xs text-fog transition-colors hover:border-frost/60 hover:text-snow"
      >
        try again
      </button>
    </div>
  );
}
