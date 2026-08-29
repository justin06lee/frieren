import Link from "next/link";

// repo / dir / dir / file — every part a link except the one you're on.
export default function Crumbs({
  repo,
  refName,
  path,
}: {
  repo: string;
  refName: string;
  path: string;
}) {
  const ref = encodeURIComponent(refName);
  const parts = path === "" ? [] : path.split("/");

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 font-mono text-base">
      <Link href={`/${repo}/tree/${ref}`} className="font-semibold text-link hover:underline">
        {repo}
      </Link>
      {parts.map((part, i) => {
        const sub = parts.slice(0, i + 1);
        const last = i === parts.length - 1;
        const href = `/${repo}/tree/${ref}/${sub.map(encodeURIComponent).join("/")}`;
        return (
          <span key={href} className="text-mute">
            {" / "}
            {last ? (
              <span className="font-semibold text-ink">{part}</span>
            ) : (
              <Link href={href} className="text-link hover:underline">
                {part}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
