import { notFound } from "next/navigation";
import { getCommit } from "@/lib/api";
import { dec } from "@/lib/params";
import { fullDate, timeAgo } from "@/lib/format";
import Diff from "@/components/Diff";

type Props = { params: Promise<{ repo: string; hash: string }> };

export default async function CommitPage({ params }: Props) {
  const p = await params;
  const repo = dec(p.repo);
  const commit = await getCommit(repo, dec(p.hash));
  if (!commit) notFound();

  return (
    <div className="space-y-6">
      <header className="border border-line bg-panel px-5 py-4">
        <h2 className="text-lg text-snow">{commit.subject}</h2>
        <p className="mt-2 font-mono text-xs text-dim">{commit.hash}</p>
        <p className="mt-1 font-mono text-xs text-fog">
          {commit.author} · {fullDate(commit.when)} ({timeAgo(commit.when)})
        </p>
      </header>
      <Diff patch={commit.patch} />
      {commit.truncated && (
        <p className="font-mono text-xs text-dim">
          diff truncated — see the full change locally with{" "}
          <code className="text-fog">git show {commit.short}</code>
        </p>
      )}
    </div>
  );
}
