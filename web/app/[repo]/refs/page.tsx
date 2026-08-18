import Link from "next/link";
import { notFound } from "next/navigation";
import { getRefs } from "@/lib/api";
import { dec } from "@/lib/params";
import { timeAgo } from "@/lib/format";

type Props = { params: Promise<{ repo: string }> };

function RefList({
  repo,
  kind,
  refs,
}: {
  repo: string;
  kind: "branch" | "tag";
  refs: { name: string; short: string; when: string; subject: string }[];
}) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-xs text-dim">
        {kind === "branch" ? "branches" : "tags"}
      </h2>
      {refs.length === 0 ? (
        <p className="text-sm text-dim">none</p>
      ) : (
        <div className="border border-line bg-panel">
          {refs.map((r) => (
            <div
              key={r.name}
              className="flex items-baseline gap-4 border-b border-line px-4 py-2.5 text-sm last:border-b-0"
            >
              {kind === "branch" ? (
                <Link
                  href={`/${repo}/tree/${encodeURIComponent(r.name)}`}
                  className="shrink-0 font-mono text-frost hover:underline"
                >
                  {r.name}
                </Link>
              ) : (
                <span className="shrink-0 font-mono text-gold/90">{r.name}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-fog">{r.subject}</span>
              <span className="shrink-0 font-mono text-xs text-dim">{timeAgo(r.when)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function RefsPage({ params }: Props) {
  const repo = dec((await params).repo);
  const refs = await getRefs(repo);
  if (!refs) notFound();
  return (
    <div className="space-y-8">
      <RefList repo={repo} kind="branch" refs={refs.branches} />
      <RefList repo={repo} kind="tag" refs={refs.tags} />
    </div>
  );
}
