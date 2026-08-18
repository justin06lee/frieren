import { apiBase } from "@/lib/api";

// Shown while the backend git server isn't reachable yet.
export default function Offline() {
  const base = apiBase();
  return (
    <div className="mx-auto max-w-xl border border-line bg-panel px-8 py-10">
      <p className="font-mono text-sm text-gold">❄ the archive is unreachable</p>
      <p className="mt-4 text-sm leading-relaxed text-fog">
        {base ? (
          <>
            This site is configured to read from <code className="text-snow">{base}</code>,
            but that server didn&apos;t answer. If you run this frieren, check that the
            backend is up and reachable from the internet.
          </>
        ) : (
          <>
            No backend is configured yet. Set the <code className="text-snow">FRIEREN_API_URL</code>{" "}
            environment variable on this deployment to the public URL of your frieren git
            server (for example <code className="text-snow">https://git.example.com</code>),
            then redeploy.
          </>
        )}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-fog">
        Everything here is read-only — the repositories live on the owner&apos;s own
        machine, and this page is just the window into them.
      </p>
    </div>
  );
}
