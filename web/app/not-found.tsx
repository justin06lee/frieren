import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl border border-line bg-panel px-8 py-10 text-center">
      <p className="font-display text-4xl">404</p>
      <p className="mt-3 text-sm text-fog">
        Whatever was here, time has taken it.{" "}
        <Link href="/" className="text-frost hover:underline">
          Back to the archive.
        </Link>
      </p>
    </div>
  );
}
