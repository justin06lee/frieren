import { notFound } from "next/navigation";
import { getBlob, getRefs } from "@/lib/api";
import { rawUrl } from "@/lib/env";
import { dec, decPath } from "@/lib/params";
import { byteSize } from "@/lib/format";
import { highlight, langForFile } from "@/lib/shiki";
import Crumbs from "@/components/Crumbs";
import CopyButton from "@/components/CopyButton";
import RefPicker from "@/components/RefPicker";
import { panel } from "@/components/ui";

type Props = { params: Promise<{ repo: string; ref: string; path: string[] }> };

export default async function BlobPage({ params }: Props) {
  const p = await params;
  const repo = dec(p.repo);
  const ref = dec(p.ref);
  const path = decPath(p.path);

  const [blob, refs] = await Promise.all([getBlob(repo, ref, path), getRefs(repo)]);
  if (!blob) notFound();

  const raw = rawUrl(repo, ref, path);
  const showable = !blob.binary && !blob.truncated;
  const lineCount = showable ? blob.content.replace(/\n$/, "").split("\n").length : 0;
  const html = showable ? await highlight(blob.content, langForFile(path)) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <RefPicker
          repo={repo}
          current={ref}
          branches={refs?.branches ?? []}
          tags={refs?.tags ?? []}
          kind="blob"
          path={path}
        />
        <Crumbs repo={repo} refName={ref} path={path} />
      </div>

      <div className={`${panel} overflow-hidden`}>
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hair bg-raised px-4 py-2.5 text-xs text-mute">
          {showable && (
            <span>
              {lineCount} {lineCount === 1 ? "line" : "lines"}
            </span>
          )}
          <span>{byteSize(blob.size)}</span>
          <div className="ml-auto flex items-center gap-4">
            <a href={raw} className="hover:text-link">
              Raw
            </a>
            {showable && <CopyButton value={blob.content} label="Copy file contents" />}
          </div>
        </header>

        {blob.binary ? (
          <p className="px-4 py-10 text-center text-sm text-mute">
            This file is binary and can&apos;t be shown.{" "}
            <a href={raw} className="text-link hover:underline">
              Download the raw bytes.
            </a>
          </p>
        ) : blob.truncated ? (
          <p className="px-4 py-10 text-center text-sm text-mute">
            This file is too large to display here.{" "}
            <a href={raw} className="text-link hover:underline">
              View it raw.
            </a>
          </p>
        ) : html ? (
          <div
            className="overflow-x-auto bg-canvas py-3 [&_pre]:px-4"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="overflow-x-auto bg-canvas px-4 py-3">
            <pre className="shiki">
              <code>
                {blob.content
                  .replace(/\n$/, "")
                  .split("\n")
                  .map((line, i) => (
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
    </div>
  );
}
