import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRepo, cloneUrl, BackendOffline } from "@/lib/api";
import { dec } from "@/lib/params";
import RepoNav from "@/components/RepoNav";
import CloneBox from "@/components/CloneBox";
import Offline from "@/components/Offline";

type Props = { children: React.ReactNode; params: Promise<{ repo: string }> };

export async function generateMetadata({ params }: { params: Promise<{ repo: string }> }): Promise<Metadata> {
  const { repo } = await params;
  return { title: dec(repo) };
}

export default async function RepoLayout({ children, params }: Props) {
  const name = dec((await params).repo);
  let repo;
  try {
    repo = await getRepo(name);
  } catch (e) {
    if (e instanceof BackendOffline) return <Offline />;
    throw e;
  }
  if (!repo) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{repo.name}</h1>
          {repo.description && <p className="mt-1 text-sm text-fog">{repo.description}</p>}
        </div>
        <CloneBox url={cloneUrl(repo.name)} />
      </div>
      <RepoNav repo={repo.name} defaultBranch={repo.default} />
      <div className="pt-6">{children}</div>
    </div>
  );
}
