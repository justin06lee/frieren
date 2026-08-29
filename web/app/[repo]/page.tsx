import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommits, getReadme, getRefs, getRepo, getTree } from "@/lib/api";
import { cloneUrl } from "@/lib/env";
import { dec } from "@/lib/params";
import { timeAgo } from "@/lib/format";
import CloneMenu from "@/components/CloneMenu";
import CopyButton from "@/components/CopyButton";
import FileTable from "@/components/FileTable";
import Readme from "@/components/Readme";
import RefPicker from "@/components/RefPicker";
import { BookIcon, BranchIcon, HistoryIcon, TagIcon } from "@/components/icons";
import { panel } from "@/components/ui";

export default async function RepoCode({ params }: { params: Promise<{ repo: string }> }) {
  const name = dec((await params).repo);
  const repo = await getRepo(name);
  if (!repo) notFound();

  const clone = cloneUrl(repo.name);

  if (repo.empty) {
    return (
      <div className={`${panel} overflow-hidden`}>
        <div className="border-b border-hair px-5 py-3">
          <h2 className="text-sm font-semibold">Quick setup — this repository is empty</h2>
        </div>
        <div className="space-y-4 px-5 py-5 text-sm">
          <div className="flex items-center gap-2 rounded-md border border-line bg-inset px-3 py-2">
            <code className="min-w-0 flex-1 truncate font-mono text-xs">{clone}</code>
            <CopyButton value={clone} label="Copy clone URL" />
          </div>
          <div>
            <p className="mb-2 font-semibold">…or push an existing repository</p>
            <pre className="overflow-x-auto rounded-md border border-line bg-inset px-4 py-3 font-mono text-xs text-mute">
              {`git remote add frieren ${clone}\ngit push frieren ${repo.default}`}
            </pre>
          </div>
          <p className="text-xs text-mute">
            git will ask for credentials: your username, and your password or the owner
            token.
          </p>
        </div>
      </div>
    );
  }

  const [entries, readme, refs, log] = await Promise.all([
    getTree(name, repo.default, ""),
    getReadme(name, repo.default),
    getRefs(name),
    getCommits(name, repo.default, 1),
  ]);

  const branches = refs?.branches ?? [];
  const tags = refs?.tags ?? [];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <RefPicker
            repo={repo.name}
            current={repo.default}
            branches={branches}
            tags={tags}
            kind="tree"
            path=""
          />
          <Link
            href={`/${repo.name}/branches`}
            className="flex items-center gap-1.5 text-sm text-mute hover:text-link"
          >
            <BranchIcon className="h-4 w-4" />
            <span className="font-semibold text-ink">{branches.length}</span>
            {branches.length === 1 ? "Branch" : "Branches"}
          </Link>
          <Link
            href={`/${repo.name}/tags`}
            className="flex items-center gap-1.5 text-sm text-mute hover:text-link"
          >
            <TagIcon className="h-4 w-4" />
            <span className="font-semibold text-ink">{tags.length}</span>
            {tags.length === 1 ? "Tag" : "Tags"}
          </Link>
          <div className="ml-auto">
            <CloneMenu url={clone} />
          </div>
        </div>

        <FileTable
          repo={repo.name}
          refName={repo.default}
          dir=""
          entries={entries ?? []}
          latest={log?.[0] ?? null}
        />

        {readme && (
          <Readme
            repo={repo.name}
            refName={repo.default}
            name={readme.name}
            source={readme.content}
          />
        )}
      </div>

      <aside className="shrink-0 space-y-4 lg:w-[296px]">
        <section>
          <h2 className="text-base font-semibold">About</h2>
          <p className="mt-2 text-sm text-mute">
            {repo.description || "No description provided."}
          </p>
          {readme && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-mute">
              <BookIcon className="h-4 w-4 text-faint" />
              <a href="#readme" className="hover:text-link">
                {readme.name}
              </a>
            </p>
          )}
        </section>

        <section className="border-t border-hair pt-4">
          <h3 className="text-sm font-semibold">Clone</h3>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-line bg-inset px-2 py-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-mute">{clone}</code>
            <CopyButton value={clone} label="Copy clone URL" />
          </div>
        </section>

        <section className="space-y-2 border-t border-hair pt-4 text-sm text-mute">
          <p className="flex items-center gap-2">
            <BranchIcon className="h-4 w-4 text-faint" />
            Default branch <span className="font-mono text-xs text-ink">{repo.default}</span>
          </p>
          <p className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4 text-faint" />
            Updated {timeAgo(repo.lastCommit)}
          </p>
        </section>
      </aside>
    </div>
  );
}
