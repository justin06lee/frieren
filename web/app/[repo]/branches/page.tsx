import Link from "next/link";
import { notFound } from "next/navigation";
import { getRefs, getRepo } from "@/lib/api";
import { dec } from "@/lib/params";
import { timeAgo } from "@/lib/format";
import { BranchIcon } from "@/components/icons";
import { panel } from "@/components/ui";

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ repo: string }>;
}) {
  const repo = dec((await params).repo);
  const [refs, info] = await Promise.all([getRefs(repo), getRepo(repo)]);
  if (!refs || !info) notFound();

  return (
    <section className="space-y-3">
      <h1 className="text-base font-semibold">Branches</h1>

      {refs.branches.length === 0 ? (
        <p className={`${panel} px-4 py-12 text-center text-sm text-mute`}>
          This repository has no branches yet.
        </p>
      ) : (
        <ul className={`${panel} divide-y divide-hair`}>
          {refs.branches.map((branch) => (
            <li
              key={branch.name}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
            >
              <BranchIcon className="h-4 w-4 shrink-0 text-mute" />
              <Link
                href={`/${repo}/tree/${encodeURIComponent(branch.name)}`}
                className="shrink-0 font-mono font-semibold text-link hover:underline"
              >
                {branch.name}
              </Link>
              {branch.name === info.default && (
                <span className="shrink-0 rounded-full border border-link/40 px-2 py-[1px] text-xs text-link">
                  default
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-mute">{branch.subject}</span>
              <Link
                href={`/${repo}/commits/${encodeURIComponent(branch.name)}`}
                className="shrink-0 font-mono text-xs text-mute hover:text-link"
              >
                {branch.short}
              </Link>
              <span className="shrink-0 text-xs text-mute">{timeAgo(branch.when)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
