import Link from "next/link";
import { getRepos, BackendOffline, type RepoInfo } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import Offline from "@/components/Offline";

// Always render against the live backend — never bake an offline state in at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  let repos: RepoInfo[];
  try {
    repos = (await getRepos()) ?? [];
  } catch (e) {
    if (e instanceof BackendOffline) return <Offline />;
    throw e;
  }

  return (
    <>
      <section className="mb-14 mt-6">
        <h1 className="font-display text-5xl leading-tight">
          Code that <em className="text-frost">outlives</em> the platforms.
        </h1>
        <p className="mt-4 max-w-2xl text-fog">
          Every repository here lives on hardware its owner controls. Browse anything,
          clone everything — writing is reserved for one person.
        </p>
      </section>

      {repos.length === 0 ? (
        <p className="border border-line bg-panel px-6 py-10 text-sm text-fog">
          The archive is empty — the first <code className="text-snow">git push</code> will
          fill it.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {repos.map((r) => (
            <Link
              key={r.name}
              href={`/${r.name}`}
              className="group border border-line bg-panel p-5 transition-colors hover:border-frost/60"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-mono text-base text-snow group-hover:text-frost">
                  {r.name}
                </h2>
                <span className="shrink-0 font-mono text-xs text-dim">
                  {r.empty ? "empty" : timeAgo(r.lastCommit)}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm text-fog">
                {r.description || "no description"}
              </p>
              <p className="mt-3 font-mono text-xs text-dim">
                <span className="text-gold/70">▪</span> {r.default}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
