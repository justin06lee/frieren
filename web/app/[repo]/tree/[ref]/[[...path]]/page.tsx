import { notFound } from "next/navigation";
import { getTree } from "@/lib/api";
import { dec, decPath } from "@/lib/params";
import TreeTable from "@/components/TreeTable";
import Crumbs from "@/components/Crumbs";

type Props = { params: Promise<{ repo: string; ref: string; path?: string[] }> };

export default async function TreePage({ params }: Props) {
  const p = await params;
  const repo = dec(p.repo);
  const ref = dec(p.ref);
  const path = decPath(p.path);
  const entries = await getTree(repo, ref, path);
  if (!entries) notFound();

  return (
    <div className="space-y-4">
      <Crumbs repo={repo} refName={ref} path={path} leafIsLink={false} />
      <TreeTable repo={repo} refName={ref} dir={path} entries={entries} />
    </div>
  );
}
