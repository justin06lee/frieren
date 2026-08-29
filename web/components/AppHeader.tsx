import Link from "next/link";
import { getViewer } from "@/lib/session";
import { FrierenMark } from "./icons";
import { btn } from "./ui";
import SearchBox from "./SearchBox";
import UserMenu from "./UserMenu";

export default async function AppHeader() {
  const viewer = await getViewer();
  return (
    <header className="border-b border-hair bg-inset">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-ink transition-opacity hover:opacity-80"
        >
          <FrierenMark className="h-7 w-7" />
          <span className="text-base font-semibold tracking-tight">frieren</span>
        </Link>

        <SearchBox />

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {viewer ? (
            <UserMenu viewer={viewer} />
          ) : (
            <Link href="/login" className={btn}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
