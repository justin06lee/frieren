import { notFound } from "next/navigation";
import { getCommit } from "@/lib/api";
import { dec } from "@/lib/params";
import { fullDate, timeAgo } from "@/lib/format";
import CopyButton from "@/components/CopyButton";
import Diff from "@/components/Diff";
import { Avatar, panel } from "@/components/ui";

type Props = { params: Promise<{ repo: string; hash: string }> };

export default async function CommitPage({ params }: Props) {
  const p = await params;
  const repo = dec(p.repo);
  const commit = await getCommit(repo, dec(p.hash));
  if (!commit) notFound();

  return (
    <div className="space-y-4">
      <header className={`${panel} overflow-hidden`}>
        <div className="px-5 py-4">
          <h1 className="text-lg font-semibold">{commit.subject}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hair bg-raised px-5 py-2.5 text-sm">
          <Avatar name={commit.author} size={20} />
          <span className="font-semibold">{commit.author}</span>
          <span className="text-mute" title={fullDate(commit.when)}>
            committed {timeAgo(commit.when)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <code className="font-mono text-xs text-mute">{commit.short}</code>
            <CopyButton value={commit.hash} label="Copy full SHA" />
          </div>
        </div>
      </header>

      <Diff patch={commit.patch} />

      {commit.truncated && (
        <p className="text-xs text-mute">
          This diff was truncated. See the whole change locally with{" "}
          <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-ink">
            git show {commit.short}
          </code>
          .
        </p>
      )}
    </div>
  );
}
