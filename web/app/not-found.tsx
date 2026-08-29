import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="text-6xl font-semibold text-mute">404</p>
      <h1 className="mt-4 text-xl font-semibold">This is not the page you&apos;re looking for</h1>
      <p className="mt-3 text-sm text-mute">
        It may have been moved, or it may be private and you&apos;re browsing as a guest.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-line bg-raised px-3 py-[5px] text-sm font-medium text-ink transition-colors hover:bg-hover"
        >
          Back to the archive
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center rounded-md border border-white/10 bg-brand px-3 py-[5px] text-sm font-medium text-white transition-colors hover:bg-brand-hi"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
