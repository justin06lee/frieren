import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMeta, getRepo } from "@/lib/api";
import { BackendOffline } from "@/lib/env";
import { getViewer } from "@/lib/session";
import { dec } from "@/lib/params";
import Offline from "@/components/Offline";
import RepoTabs from "@/components/RepoTabs";
import { LockIcon, RepoIcon } from "@/components/icons";
import { VisibilityBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode; params: Promise<{ repo: string }> };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ repo: string }>;
}): Promise<Metadata> {
  return { title: dec((await params).repo) };
}

export default async function RepoLayout({ children, params }: Props) {
  const name = dec((await params).repo);

  let repo, owner;
  try {
    [repo, owner] = await Promise.all([getRepo(name), getMeta()]);
  } catch (e) {
    if (e instanceof BackendOffline) return <Offline />;
    throw e;
  }
  if (!repo) notFound();

  const viewer = await getViewer();

  return (
    <div>
      {/* Full-bleed header strip, the way GitHub separates repo chrome from content */}
      <div className="-mx-4 border-b border-hair px-4 md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <RepoIcon className="h-4 w-4 text-mute" />
          {owner?.owner && (
            <>
              <Link href="/" className="text-xl text-link hover:underline">
                {owner.owner}
              </Link>
              <span className="text-xl text-mute">/</span>
            </>
          )}
          <Link
            href={`/${repo.name}`}
            className="text-xl font-semibold text-link hover:underline"
          >
            {repo.name}
          </Link>
          <VisibilityBadge isPrivate={repo.private} />
        </div>

        {repo.private && !viewer && (
          <p className="mb-3 flex items-center gap-2 text-xs text-amber">
            <LockIcon className="h-3.5 w-3.5" />
            Private repository
          </p>
        )}

        <RepoTabs repo={repo.name} isOwner={Boolean(viewer?.owner)} />
      </div>

      <div className="pt-6">{children}</div>
    </div>
  );
}
