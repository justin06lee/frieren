"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BranchIcon, ChevronDownIcon, CheckIcon, TagIcon } from "./icons";
import { btn, input } from "./ui";

type RefName = { name: string };

// The branch/tag switcher. Changing ref keeps you on the same path, which is
// what you almost always want when comparing a file across branches.
export default function RefPicker({
  repo,
  current,
  branches,
  tags,
  kind,
  path,
}: {
  repo: string;
  current: string;
  branches: RefName[];
  tags: RefName[];
  kind: "tree" | "blob";
  path: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"branches" | "tags">("branches");
  const [filter, setFilter] = useState("");
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

  const list = useMemo(() => {
    const source = tab === "branches" ? branches : tags;
    const needle = filter.trim().toLowerCase();
    return needle ? source.filter((r) => r.name.toLowerCase().includes(needle)) : source;
  }, [tab, filter, branches, tags]);

  const hrefFor = (ref: string) => {
    const suffix = path ? `/${path.split("/").map(encodeURIComponent).join("/")}` : "";
    return `/${encodeURIComponent(repo)}/${kind}/${encodeURIComponent(ref)}${suffix}`;
  };

  const tabClass = (on: boolean) =>
    `flex-1 border-b px-3 py-2 text-sm transition-colors ${
      on ? "border-active font-semibold text-ink" : "border-hair text-mute hover:text-ink"
    }`;

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={btn}
      >
        <BranchIcon className="h-4 w-4 text-mute" />
        <span className="max-w-[16ch] truncate font-semibold">{current}</span>
        <ChevronDownIcon className="h-3 w-3 text-mute" />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-2 w-[300px] overflow-hidden rounded-md border border-line bg-raised shadow-xl shadow-black/40">
          <div className="border-b border-hair p-3">
            <p className="mb-2 text-sm font-semibold">Switch branches/tags</p>
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`Find a ${tab === "branches" ? "branch" : "tag"}…`}
              aria-label="Filter refs"
              className={input}
            />
          </div>

          <div className="flex">
            <button type="button" onClick={() => setTab("branches")} className={tabClass(tab === "branches")}>
              Branches
            </button>
            <button type="button" onClick={() => setTab("tags")} className={tabClass(tab === "tags")}>
              Tags
            </button>
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {list.length === 0 && (
              <li className="px-3 py-4 text-sm text-mute">
                Nothing matched {tab === "branches" ? "that branch" : "that tag"}.
              </li>
            )}
            {list.map((ref) => {
              const on = ref.name === current;
              return (
                <li key={ref.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => {
                      setOpen(false);
                      router.push(hrefFor(ref.name));
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-hover"
                  >
                    {on ? (
                      <CheckIcon className="h-4 w-4 shrink-0 text-ink" />
                    ) : (
                      <span className="h-4 w-4 shrink-0" />
                    )}
                    {tab === "tags" && <TagIcon className="h-3.5 w-3.5 shrink-0 text-mute" />}
                    <span className="truncate font-mono text-xs">{ref.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
