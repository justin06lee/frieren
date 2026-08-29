import Link from "next/link";
import { getMeta, getRepos } from "@/lib/api";
import { BackendOffline } from "@/lib/env";
import { getViewer } from "@/lib/session";
import { timeAgo } from "@/lib/format";
import type { RepoInfo } from "@/lib/types";
import Offline from "@/components/Offline";
import { BranchIcon, LockIcon, RepoIcon } from "@/components/icons";
import { Avatar, btn, btnPrimary, Counter, panel, VisibilityBadge } from "@/components/ui";

// Always render against the live backend: the repository list depends on who
// is asking, and an offline state must never be baked in at build time.
export const dynamic = "force-dynamic";

type Search = { q?: string; type?: string };

function matches(repo: RepoInfo, q: string) {
  const needle = q.toLowerCase();
  return (
    repo.name.toLowerCase().includes(needle) ||
    repo.description.toLowerCase().includes(needle)
  );
}

export default async function ArchiveHome({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { q = "", type = "all" } = await searchParams;
  const viewer = await getViewer();

  let repos: RepoInfo[];
  let owner = "the owner";
  try {
    const [list, meta] = await Promise.all([getRepos(), getMeta()]);
    repos = list ?? [];
    if (meta?.owner) owner = meta.owner;
  } catch (e) {
    if (e instanceof BackendOffline) return <Offline />;
    throw e;
  }

  const privateCount = repos.filter((r) => r.private).length;
  const shown = repos
    .filter((r) => (type === "public" ? !r.private : type === "private" ? r.private : true))
    .filter((r) => (q ? matches(r, q) : true));

  const tab = (label: string, value: string, count: number) => {
    const href = value === "all" ? (q ? `/?q=${encodeURIComponent(q)}` : "/") : `/?type=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
    const on = type === value;
    return (
      <Link
        key={value}
        href={href}
        className={`flex items-center gap-2 rounded-md px-3 py-1 text-sm transition-colors ${
          on ? "bg-raised font-semibold text-ink" : "text-mute hover:text-ink"
        }`}
      >
        {label}
        <Counter>{count}</Counter>
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
      {/* Identity column */}
      <aside className="shrink-0 lg:w-[296px]">
        <div className="flex items-end gap-4 lg:block">
          <div className="lg:mb-4">
            <div className="lg:hidden">
              <Avatar name={owner} size={72} />
            </div>
            <div className="hidden lg:block">
              <Avatar name={owner} size={260} />
            </div>
          </div>
          <div className="pb-1 lg:pb-0">
            <h1 className="text-2xl font-semibold leading-tight">{owner}</h1>
            <p className="text-xl font-light text-mute">frieren archive</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-mute">
          Every repository here lives on hardware {owner} controls. Clone anything you can
          see — writing is reserved for one person.
        </p>

        <div className="mt-5">
          {viewer ? (
            <Link href="/settings" className={`${btn} w-full`}>
              Account settings
            </Link>
          ) : (
            <Link href="/login" className={`${btnPrimary} w-full`}>
              Sign in
            </Link>
          )}
        </div>

        <dl className="mt-5 space-y-2 border-t border-hair pt-4 text-sm text-mute">
          <div className="flex items-center gap-2">
            <RepoIcon className="h-4 w-4 text-faint" />
            <dt className="sr-only">Repositories</dt>
            <dd>
              <span className="font-semibold text-ink">{repos.length}</span>{" "}
              {repos.length === 1 ? "repository" : "repositories"}
            </dd>
          </div>
          {viewer && (
            <div className="flex items-center gap-2">
              <LockIcon className="h-4 w-4 text-faint" />
              <dt className="sr-only">Private repositories</dt>
              <dd>
                <span className="font-semibold text-ink">{privateCount}</span> private
              </dd>
            </div>
          )}
        </dl>

        {!viewer && (
          <p className="mt-4 rounded-md border border-hair bg-panel px-3 py-2.5 text-xs leading-relaxed text-mute">
            You&apos;re browsing as a guest, so this lists public repositories only.{" "}
            <Link href="/login" className="text-link hover:underline">
              Sign in
            </Link>{" "}
            to see private ones too.
          </p>
        )}
      </aside>

      {/* Repository column */}
      <section className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair pb-3">
          <h2 className="text-base font-semibold">Repositories</h2>
          <div className="flex items-center gap-1">
            {tab("All", "all", repos.length)}
            {tab("Public", "public", repos.length - privateCount)}
            {viewer && tab("Private", "private", privateCount)}
          </div>
        </div>

        {q && (
          <p className="pt-3 text-sm text-mute">
            {shown.length} {shown.length === 1 ? "result" : "results"} for{" "}
            <span className="font-semibold text-ink">{q}</span> ·{" "}
            <Link href="/" className="text-link hover:underline">
              clear
            </Link>
          </p>
        )}

        {shown.length === 0 ? (
          <div className={`mt-4 ${panel} px-6 py-12 text-center`}>
            <RepoIcon className="mx-auto h-8 w-8 text-faint" />
            <p className="mt-3 text-sm font-semibold">
              {repos.length === 0 ? "This archive is empty" : "No repositories matched"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-mute">
              {repos.length === 0
                ? "The first git push will fill it."
                : "Try a different search, or clear the filter."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-hair">
            {shown.map((repo) => (
              <li key={repo.name} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/${repo.name}`}
                      className="text-xl font-semibold text-link hover:underline"
                    >
                      {repo.name}
                    </Link>
                    <VisibilityBadge isPrivate={repo.private} />
                  </div>
                  {repo.description && (
                    <p className="mt-1 max-w-2xl text-sm text-mute">{repo.description}</p>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
                    <span className="inline-flex items-center gap-1">
                      <BranchIcon className="h-3.5 w-3.5 text-faint" />
                      {repo.default}
                    </span>
                    <span>
                      {repo.empty ? "No commits yet" : `Updated ${timeAgo(repo.lastCommit)}`}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
