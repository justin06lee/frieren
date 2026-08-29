import Link from "next/link";
import { notFound } from "next/navigation";
import { getRefs } from "@/lib/api";
import { dec } from "@/lib/params";
import { timeAgo } from "@/lib/format";
import { TagIcon } from "@/components/icons";
import { panel } from "@/components/ui";

export default async function TagsPage({ params }: { params: Promise<{ repo: string }> }) {
  const repo = dec((await params).repo);
  const refs = await getRefs(repo);
  if (!refs) notFound();

  return (
    <section className="space-y-3">
      <h1 className="text-base font-semibold">Tags</h1>

      {refs.tags.length === 0 ? (
        <p className={`${panel} px-4 py-12 text-center text-sm text-mute`}>
          No tags yet. Push one with{" "}
          <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-xs text-ink">
            git push --tags
          </code>
          .
        </p>
      ) : (
        <ul className={`${panel} divide-y divide-hair`}>
          {refs.tags.map((tag) => (
            <li
              key={tag.name}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
            >
              <TagIcon className="h-4 w-4 shrink-0 text-mute" />
              {/* Tags are browsable refs, so this points at the tree they name. */}
              <Link
                href={`/${repo}/tree/${encodeURIComponent(tag.name)}`}
                className="shrink-0 font-mono font-semibold text-link hover:underline"
              >
                {tag.name}
              </Link>
              <span className="min-w-0 flex-1 truncate text-mute">{tag.subject}</span>
              <Link
                href={`/${repo}/commits/${encodeURIComponent(tag.name)}`}
                className="shrink-0 font-mono text-xs text-mute hover:text-link"
              >
                {tag.short}
              </Link>
              <span className="shrink-0 text-xs text-mute">{timeAgo(tag.when)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
