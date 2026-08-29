import { notFound } from "next/navigation";
import { getRefs, getTree } from "@/lib/api";
import { dec, decPath } from "@/lib/params";
import Crumbs from "@/components/Crumbs";
import FileTable from "@/components/FileTable";
import RefPicker from "@/components/RefPicker";

type Props = { params: Promise<{ repo: string; ref: string; path?: string[] }> };

export default async function TreePage({ params }: Props) {
  const p = await params;
  const repo = dec(p.repo);
  const ref = dec(p.ref);
  const path = decPath(p.path);

  const [entries, refs] = await Promise.all([getTree(repo, ref, path), getRefs(repo)]);
  if (!entries) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <RefPicker
          repo={repo}
          current={ref}
          branches={refs?.branches ?? []}
          tags={refs?.tags ?? []}
          kind="tree"
          path={path}
        />
        <Crumbs repo={repo} refName={ref} path={path} />
      </div>

      <FileTable repo={repo} refName={ref} dir={path} entries={entries} />
    </div>
  );
}
