import Link from "next/link";
import type { TreeEntry } from "@/lib/api";
import { byteSize } from "@/lib/format";

function DirIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-gold/80" aria-hidden shapeRendering="crispEdges">
      <path d="M1 3h5l1 2h8v8H1z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-dim" aria-hidden shapeRendering="crispEdges">
      <path d="M3 1h7l3 3v11H3z" />
    </svg>
  );
}

export default function TreeTable({
  repo,
  refName,
  dir,
  entries,
}: {
  repo: string;
  refName: string;
  dir: string;
  entries: TreeEntry[];
}) {
  const ref = encodeURIComponent(refName);
  const base = dir ? `${dir}/` : "";
  return (
    <div className="border border-line bg-panel">
      {entries.map((e) => {
        const href = `/${repo}/${e.type === "tree" ? "tree" : "blob"}/${ref}/${base}${e.name}`;
        return (
          <div
            key={e.name}
            className="flex items-center gap-3 border-b border-line px-4 py-2 text-sm last:border-b-0 hover:bg-raise"
          >
            {e.type === "tree" ? <DirIcon /> : <FileIcon />}
            {e.type === "commit" ? (
              <span className="font-mono text-fog">{e.name} @ {e.hash.slice(0, 7)}</span>
            ) : (
              <Link href={href} className="font-mono text-snow hover:text-frost">
                {e.name}
                {e.type === "tree" ? "/" : ""}
              </Link>
            )}
            <span className="ml-auto font-mono text-xs text-dim">
              {e.type === "blob" ? byteSize(e.size) : ""}
            </span>
          </div>
        );
      })}
      {entries.length === 0 && (
        <p className="px-4 py-6 text-sm text-fog">empty directory</p>
      )}
    </div>
  );
}
