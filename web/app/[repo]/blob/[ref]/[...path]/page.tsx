import { notFound } from "next/navigation";
import { getBlob, rawUrl } from "@/lib/api";
import { dec, decPath } from "@/lib/params";
import { byteSize } from "@/lib/format";
import { highlight, langForFile } from "@/lib/shiki";
import Crumbs from "@/components/Crumbs";

type Props = { params: Promise<{ repo: string; ref: string; path: string[] }> };

export default async function BlobPage({ params }: Props) {
  const p = await params;
  const repo = dec(p.repo);
  const ref = dec(p.ref);
  const path = decPath(p.path);
  const blob = await getBlob(repo, ref, path);
  if (!blob) notFound();

  const html = blob.binary || blob.truncated ? null : await highlight(blob.content, langForFile(path));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Crumbs repo={repo} refName={ref} path={path} leafIsLink={false} />
        <p className="font-mono text-xs text-dim">
          {byteSize(blob.size)} ·{" "}
          <a href={rawUrl(repo, ref, path)} className="text-fog hover:text-frost">
            raw
          </a>
        </p>
      </div>
      {blob.binary ? (
        <p className="border border-line bg-panel px-4 py-8 text-sm text-fog">
          Binary file.{" "}
          <a href={rawUrl(repo, ref, path)} className="text-frost hover:underline">
            Download the raw bytes.
          </a>
        </p>
      ) : blob.truncated ? (
        <p className="border border-line bg-panel px-4 py-8 text-sm text-fog">
          Too large to display here.{" "}
          <a href={rawUrl(repo, ref, path)} className="text-frost hover:underline">
            View raw instead.
          </a>
        </p>
      ) : html ? (
        <div
          className="overflow-x-auto border border-line bg-abyss px-0 py-3 [&_pre]:px-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-abyss px-4 py-3">
          <pre className="shiki">
            <code>
              {blob.content.replace(/\n$/, "").split("\n").map((line, i) => (
                <span key={i} className="line">
                  {line}
                  {"\n"}
                </span>
              ))}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}
