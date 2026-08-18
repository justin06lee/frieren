import Link from "next/link";

// Breadcrumb path for tree/blob pages: repo / dir / dir / name
export default function Crumbs({
  repo,
  refName,
  path,
  leafIsLink,
}: {
  repo: string;
  refName: string;
  path: string;
  leafIsLink: boolean;
}) {
  const ref = encodeURIComponent(refName);
  const parts = path === "" ? [] : path.split("/");
  return (
    <p className="font-mono text-sm text-fog">
      <Link href={`/${repo}/tree/${ref}`} className="text-snow hover:text-frost">
        {repo}
      </Link>
      {parts.map((part, i) => {
        const sub = parts.slice(0, i + 1).join("/");
        const last = i === parts.length - 1;
        return (
          <span key={sub}>
            {" / "}
            {last && !leafIsLink ? (
              <span className="text-snow">{part}</span>
            ) : (
              <Link href={`/${repo}/tree/${ref}/${sub}`} className="hover:text-frost">
                {part}
              </Link>
            )}
          </span>
        );
      })}
      <span className="ml-3 border border-line px-1.5 py-0.5 text-xs text-frost">{refName}</span>
    </p>
  );
}
