import { notFound } from "next/navigation";
import { getRepo, getTree, getReadme, cloneUrl } from "@/lib/api";
import { dec } from "@/lib/params";
import { timeAgo } from "@/lib/format";
import TreeTable from "@/components/TreeTable";
import Markdown from "@/components/Markdown";

export default async function RepoOverview({ params }: { params: Promise<{ repo: string }> }) {
  const name = dec((await params).repo);
  const repo = await getRepo(name);
  if (!repo) notFound();

  if (repo.empty) {
    return (
      <div className="border border-line bg-panel px-6 py-10">
        <p className="font-mono text-sm text-gold">❄ an empty vessel</p>
        <p className="mt-3 text-sm text-fog">The owner hasn&apos;t pushed anything yet:</p>
        <pre className="mt-4 overflow-x-auto border border-line bg-abyss px-4 py-3 font-mono text-xs text-fog">
          {`git remote add frieren ${cloneUrl(repo.name)}\ngit push frieren ${repo.default}`}
        </pre>
      </div>
    );
  }

  const [entries, readme] = await Promise.all([
    getTree(name, repo.default, ""),
    getReadme(name, repo.default),
  ]);

  return (
    <div className="space-y-8">
      <p className="font-mono text-xs text-dim">
        <span className="text-gold/70">▪</span> {repo.default} · last commit{" "}
        {timeAgo(repo.lastCommit)}
      </p>
      <TreeTable repo={repo.name} refName={repo.default} dir="" entries={entries ?? []} />
      {readme && (
        <section>
          <h2 className="mb-3 border-b border-line pb-2 font-mono text-xs text-dim">
            {readme.name}
          </h2>
          <Markdown repo={repo.name} refName={repo.default} source={readme.content} />
        </section>
      )}
    </div>
  );
}
