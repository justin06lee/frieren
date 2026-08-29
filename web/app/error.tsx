"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-md border border-hair bg-panel px-6 py-8">
      <h2 className="text-base font-semibold">Something went wrong</h2>
      <p className="mt-3 text-sm leading-relaxed text-mute">
        This page couldn&apos;t be rendered. The backend may be restarting — the
        repositories themselves are safe on the owner&apos;s machine.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex items-center rounded-md border border-line bg-raised px-3 py-[5px] text-sm font-medium text-ink transition-colors hover:bg-hover"
      >
        Try again
      </button>
    </div>
  );
}
