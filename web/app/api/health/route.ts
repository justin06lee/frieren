import { apiBase } from "@/lib/env";

// Reports whether this deployment can reach its backend — the first place to
// look when the site shows the offline card.
export const dynamic = "force-dynamic";

export async function GET() {
  const base = apiBase();
  if (!base) {
    return Response.json({ configured: false, ok: false });
  }
  const started = Date.now();
  try {
    const res = await fetch(`${base}/api/repos`, { cache: "no-store" });
    return Response.json({
      configured: true,
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
    });
  } catch (e) {
    const cause = e instanceof Error ? (e.cause as { code?: string } | undefined) : undefined;
    return Response.json({
      configured: true,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      code: cause?.code ?? null,
      ms: Date.now() - started,
    });
  }
}
