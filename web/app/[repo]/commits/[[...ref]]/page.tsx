import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommits, getRefs, getRepo } from "@/lib/api";
import { dec, decPath } from "@/lib/params";
import { dayKey, dayLabel, timeAgo } from "@/lib/format";
import type { Commit } from "@/lib/types";
import CopyButton from "@/components/CopyButton";
import RefPicker from "@/components/RefPicker";
import { Avatar, panel } from "@/components/ui";

type Props = { params: Promise<{ repo: string; ref?: string[] }> };

// Commits arrive newest-first, so grouping preserves that order per day.
function byDay(commits: Commit[]): { key: string; label: string; commits: Commit[] }[] {
  const groups: { key: string; label: string; commits: Commit[] }[] = [];
  for (const commit of commits) {
    const key = dayKey(commit.when);
    const last = groups.at(-1);
    if (last?.key === key) last.commits.push(commit);
    else groups.push({ key, label: dayLabel(commit.when), commits: [commit] });
  }
  return groups;
}

export default async function CommitsPage({ params }: Props) {
  const p = await params;
  const repo = dec(p.repo);
  const info = await getRepo(repo);
  if (!info) notFound();

  const ref = p.ref?.length ? decPath(p.ref) : info.default;
  const [commits, refs] = await Promise.all([getCommits(repo, ref), getRefs(repo)]);
  if (!commits) notFound();

  const groups = byDay(commits);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <RefPicker
          repo={repo}
          current={ref}
          branches={refs?.branches ?? []}
          tags={refs?.tags ?? []}
          kind="tree"
          path=""
        />
        {commits.length === 100 && (
          <p className="text-xs text-mute">Showing the 100 most recent commits.</p>
        )}
      </div>

      {commits.length === 0 ? (
        <p className={`${panel} px-4 py-12 text-center text-sm text-mute`}>
          No commits on this branch yet.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="mb-3 text-sm font-semibold text-mute">
                Commits on {group.label}
              </h2>
              <ul className={`${panel} divide-y divide-hair`}>
                {group.commits.map((commit) => (
                  <li
                    key={commit.hash}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/${repo}/commit/${commit.hash}`}
                        className="block truncate font-semibold text-ink hover:text-link hover:underline"
                      >
                        {commit.subject}
                      </Link>
                      <p className="mt-1 flex items-center gap-2 text-xs text-mute">
                        <Avatar name={commit.author} size={16} />
                        <span className="font-semibold text-mute">{commit.author}</span>
                        <span>committed {timeAgo(commit.when)}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-md border border-line px-2 py-1">
                      <Link
                        href={`/${repo}/commit/${commit.hash}`}
                        className="font-mono text-xs text-mute hover:text-link"
                      >
                        {commit.short}
                      </Link>
                      <CopyButton value={commit.hash} label="Copy full SHA" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
