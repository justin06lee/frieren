import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo, getCommits } from "@/lib/api";
import { dec, decPath } from "@/lib/params";
import { timeAgo } from "@/lib/format";

type Props = { params: Promise<{ repo: string; ref?: string[] }> };

export default async function CommitsPage({ params }: Props) {
  const p = await params;
  const repo = dec(p.repo);
  const info = await getRepo(repo);
  if (!info) notFound();
  const ref = p.ref?.length ? decPath(p.ref) : info.default;
  const commits = await getCommits(repo, ref);
  if (!commits) notFound();

  return (
    <div className="space-y-4">
      <p className="font-mono text-xs text-dim">
        history of <span className="text-frost">{ref}</span>
        {commits.length === 100 && " · latest 100"}
      </p>
      {commits.length === 0 ? (
        <p className="border border-line bg-panel px-4 py-8 text-sm text-fog">No commits yet.</p>
      ) : (
        <div className="border border-line bg-panel">
          {commits.map((c) => (
            <Link
              key={c.hash}
              href={`/${repo}/commit/${c.hash}`}
              className="flex items-baseline gap-4 border-b border-line px-4 py-2.5 text-sm last:border-b-0 hover:bg-raise"
            >
              <span className="shrink-0 font-mono text-xs text-gold/80">{c.short}</span>
              <span className="min-w-0 flex-1 truncate text-snow">{c.subject}</span>
              <span className="hidden shrink-0 font-mono text-xs text-dim sm:inline">
                {c.author}
              </span>
              <span className="shrink-0 font-mono text-xs text-dim">{timeAgo(c.when)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
