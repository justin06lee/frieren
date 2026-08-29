import { apiBase } from "@/lib/env";
import { AlertIcon } from "./icons";
import { panel } from "./ui";

// Shown when the backend git server isn't answering. The archive itself is
// fine — this deployment just can't reach it — so the copy says so.
export default function Offline() {
  const base = apiBase();
  return (
    <div className={`mx-auto max-w-2xl ${panel} overflow-hidden`}>
      <div className="flex items-center gap-2 border-b border-hair bg-raised px-4 py-3">
        <AlertIcon className="h-4 w-4 text-amber" />
        <h2 className="text-sm font-semibold">The archive is unreachable</h2>
      </div>
      <div className="space-y-4 px-4 py-5 text-sm leading-relaxed text-mute">
        {base ? (
          <p>
            This site reads from{" "}
            <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-xs text-ink">
              {base}
            </code>
            , which didn&apos;t answer. If this is your frieren, check that the server is
            running and reachable from the internet.
          </p>
        ) : (
          <p>
            No backend is configured. Set{" "}
            <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-xs text-ink">
              FRIEREN_API_URL
            </code>{" "}
            on this deployment to your git server&apos;s public URL — for example{" "}
            <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-xs text-ink">
              https://git.example.com
            </code>{" "}
            — then redeploy.
          </p>
        )}
        <p>
          Nothing is lost: the repositories live on the owner&apos;s own machine, and this
          site is only a window onto them.
        </p>
        <p className="text-xs text-faint">
          <a href="/api/health" className="text-link hover:underline">
            /api/health
          </a>{" "}
          reports what this deployment sees.
        </p>
      </div>
    </div>
  );
}
