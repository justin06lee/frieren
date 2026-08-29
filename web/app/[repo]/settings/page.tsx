import { notFound, redirect } from "next/navigation";
import { getRepo } from "@/lib/api";
import { cloneUrl } from "@/lib/env";
import { getViewer } from "@/lib/session";
import { dec } from "@/lib/params";
import { DescriptionForm, VisibilityForm } from "@/components/RepoSettingsForms";
import { AlertIcon } from "@/components/icons";
import { VisibilityBadge, panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RepoSettings({
  params,
}: {
  params: Promise<{ repo: string }>;
}) {
  const name = dec((await params).repo);
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  // The backend refuses these writes for anyone but the owner; this just
  // keeps the page from being a dead end.
  if (!viewer.owner) notFound();

  const repo = await getRepo(name);
  if (!repo) notFound();

  return (
    <div className="max-w-3xl space-y-10">
      <section>
        <h1 className="border-b border-hair pb-2 text-lg font-normal">General</h1>
        <div className="mt-4">
          <DescriptionForm repo={repo.name} description={repo.description} />
        </div>
      </section>

      <section>
        <h2 className="border-b border-hair pb-2 text-lg font-normal">Visibility</h2>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-mute">
          This repository is currently <VisibilityBadge isPrivate={repo.private} />
        </p>
        <div className="mt-4">
          <VisibilityForm repo={repo.name} isPrivate={repo.private} />
        </div>

        <div className={`mt-5 ${panel} flex gap-3 px-4 py-3 text-xs text-mute`}>
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <p>
            Making a repository private stops guests from cloning{" "}
            <code className="font-mono text-ink">{cloneUrl(repo.name)}</code>, but it can&apos;t
            recall copies people already have. Rotate any credential that was committed to
            it as well.
          </p>
        </div>
      </section>
    </div>
  );
}
