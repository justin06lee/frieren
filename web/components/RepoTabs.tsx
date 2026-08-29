"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BranchIcon, CodeIcon, GearIcon, HistoryIcon, TagIcon } from "./icons";

type Tab = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: (path: string, base: string) => boolean;
};

const TABS: Tab[] = [
  {
    label: "Code",
    href: "",
    icon: CodeIcon,
    active: (p, b) => p === b || p.startsWith(`${b}/tree/`) || p.startsWith(`${b}/blob/`),
  },
  {
    label: "Commits",
    href: "/commits",
    icon: HistoryIcon,
    active: (p, b) => p.startsWith(`${b}/commits`) || p.startsWith(`${b}/commit/`),
  },
  { label: "Branches", href: "/branches", icon: BranchIcon, active: (p, b) => p === `${b}/branches` },
  { label: "Tags", href: "/tags", icon: TagIcon, active: (p, b) => p === `${b}/tags` },
];

const SETTINGS: Tab = {
  label: "Settings",
  href: "/settings",
  icon: GearIcon,
  active: (p, b) => p === `${b}/settings`,
};

export default function RepoTabs({ repo, isOwner }: { repo: string; isOwner: boolean }) {
  const pathname = usePathname();
  const base = `/${encodeURIComponent(repo)}`;
  const tabs = isOwner ? [...TABS, SETTINGS] : TABS;

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Repository">
      {tabs.map((tab) => {
        const on = tab.active(pathname, base);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.label}
            href={base + tab.href}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors ${
              on
                ? "border-active font-semibold text-ink"
                : "border-transparent text-mute hover:border-line hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4 text-mute" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
