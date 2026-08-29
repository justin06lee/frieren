"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/actions";
import type { Viewer } from "@/lib/types";
import { Avatar } from "./ui";
import { ChevronDownIcon, GearIcon, PersonIcon, RepoIcon, SignOutIcon } from "./icons";

export default function UserMenu({ viewer }: { viewer: Viewer }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink transition-colors hover:bg-hover";

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Signed in as ${viewer.username}`}
        className="flex items-center gap-1 rounded-full p-0.5 transition-colors hover:bg-hover"
      >
        <Avatar name={viewer.username} size={26} />
        <ChevronDownIcon className="h-3 w-3 text-mute" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-md border border-line bg-raised shadow-xl shadow-black/40"
        >
          <div className="border-b border-hair px-3 py-2.5 text-sm">
            Signed in as <span className="font-semibold">{viewer.username}</span>
            <p className="mt-0.5 text-xs text-mute">
              Seat {viewer.seat}
              {viewer.owner ? " · owner" : ""}
            </p>
          </div>
          <div className="border-b border-hair py-1">
            <Link href="/" className={item} onClick={() => setOpen(false)} role="menuitem">
              <RepoIcon className="h-4 w-4 text-mute" />
              Your repositories
            </Link>
            <Link href="/settings" className={item} onClick={() => setOpen(false)} role="menuitem">
              <PersonIcon className="h-4 w-4 text-mute" />
              Your profile
            </Link>
            <Link
              href="/settings"
              className={item}
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              <GearIcon className="h-4 w-4 text-mute" />
              Settings
            </Link>
          </div>
          <form action={signOut}>
            <button type="submit" className={item} role="menuitem">
              <SignOutIcon className="h-4 w-4 text-mute" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
