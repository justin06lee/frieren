"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "./icons";

// Filters the repository list. It only ever narrows what the viewer is already
// allowed to see, because the filtering happens on the archive page itself.
export default function SearchBox({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(initial), [initial]);

  // "/" focuses search, the way it does on GitHub.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        field.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className="hidden min-w-0 flex-1 sm:block sm:max-w-xs"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(value.trim() ? `/?q=${encodeURIComponent(value.trim())}` : "/");
      }}
    >
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          ref={field}
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search repositories"
          aria-label="Search repositories"
          className="w-full rounded-md border border-line bg-canvas py-1 pl-8 pr-8 text-sm text-ink placeholder:text-faint focus:border-link focus:outline-none"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-[11px] text-faint md:block">
          /
        </kbd>
      </div>
    </form>
  );
}
