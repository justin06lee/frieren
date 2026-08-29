import Link from "next/link";
import { byteSize, timeAgo } from "@/lib/format";
import type { Commit, TreeEntry } from "@/lib/types";
import { FileIcon, FolderIcon } from "./icons";
import { Avatar, panel } from "./ui";

// Per-file "last commit" columns would cost one git process per row, so the
// table carries the directory's latest commit in its header instead.
export default function FileTable({
  repo,
  refName,
  dir,
  entries,
  latest,
}: {
  repo: string;
  refName: string;
  dir: string;
  entries: TreeEntry[];
  latest?: Commit | null;
}) {
  const ref = encodeURIComponent(refName);
  const base = dir ? `${dir}/` : "";
  const up = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "";

  return (
    <div className={`${panel} overflow-hidden`}>
      {latest && (
        <div className="flex items-center gap-2 border-b border-hair bg-raised px-4 py-2.5 text-sm">
          <Avatar name={latest.author} size={20} />
          <span className="shrink-0 font-semibold">{latest.author}</span>
          <Link
            href={`/${repo}/commit/${latest.hash}`}
            className="min-w-0 flex-1 truncate text-mute hover:text-link hover:underline"
          >
            {latest.subject}
          </Link>
          <Link
            href={`/${repo}/commit/${latest.hash}`}
            className="hidden shrink-0 font-mono text-xs text-mute hover:text-link sm:inline"
          >
            {latest.short}
          </Link>
          <span className="shrink-0 text-xs text-mute">{timeAgo(latest.when)}</span>
        </div>
      )}

      <ul className="divide-y divide-hair">
        {dir && (
          <li>
            <Link
              href={`/${repo}/tree/${ref}${up ? `/${up}` : ""}`}
              className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-hover"
            >
              <FolderIcon className="h-4 w-4 text-link" />
              <span className="font-mono text-mute">..</span>
            </Link>
          </li>
        )}

        {entries.map((entry) => {
          const isDir = entry.type === "tree";
          const href = `/${repo}/${isDir ? "tree" : "blob"}/${ref}/${base}${entry.name
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`;

          if (entry.type === "commit") {
            return (
              <li
                key={entry.name}
                className="flex items-center gap-3 px-4 py-2 text-sm text-mute"
                title="Submodule"
              >
                <FolderIcon className="h-4 w-4 text-faint" />
                <span className="font-mono">{entry.name}</span>
                <span className="ml-auto font-mono text-xs text-faint">
                  @ {entry.hash.slice(0, 7)}
                </span>
              </li>
            );
          }

          return (
            <li key={entry.name}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-hover"
              >
                {isDir ? (
                  <FolderIcon className="h-4 w-4 shrink-0 text-link" />
                ) : (
                  <FileIcon className="h-4 w-4 shrink-0 text-mute" />
                )}
                <span className="truncate text-ink hover:text-link hover:underline">
                  {entry.name}
                </span>
                <span className="ml-auto shrink-0 font-mono text-xs text-mute">
                  {isDir ? "" : byteSize(entry.size)}
                </span>
              </Link>
            </li>
          );
        })}

        {entries.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-mute">This directory is empty.</li>
        )}
      </ul>
    </div>
  );
}
