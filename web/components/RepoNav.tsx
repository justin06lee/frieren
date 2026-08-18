"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RepoNav({
  repo,
  defaultBranch,
}: {
  repo: string;
  defaultBranch: string;
}) {
  const pathname = usePathname();
  const base = `/${repo}`;
  const tabs = [
    { label: "overview", href: base, active: pathname === base },
    {
      label: "files",
      href: `${base}/tree/${encodeURIComponent(defaultBranch)}`,
      active: pathname.startsWith(`${base}/tree/`) || pathname.startsWith(`${base}/blob/`),
    },
    {
      label: "commits",
      href: `${base}/commits`,
      active: pathname.startsWith(`${base}/commit`),
    },
    { label: "refs", href: `${base}/refs`, active: pathname === `${base}/refs` },
  ];
  return (
    <nav className="flex gap-6 border-b border-line font-mono text-sm">
      {tabs.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={
            t.active
              ? "-mb-px border-b border-frost pb-2 text-snow"
              : "pb-2 text-fog transition-colors hover:text-snow"
          }
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
