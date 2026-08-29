// Where the backend lives. Only ever read on the server: the browser never
// learns the archive's address, and the backend never needs CORS.

export function apiBase(): string | null {
  const base = process.env.FRIEREN_API_URL;
  return base ? base.replace(/\/+$/, "") : null;
}

// Where git users point their clients — defaults to the API host.
export function cloneUrl(repo: string): string {
  const base = process.env.FRIEREN_CLONE_URL?.replace(/\/+$/, "") ?? apiBase();
  return `${base ?? "https://your-frieren-server"}/${repo}.git`;
}

export function rawUrl(repo: string, ref: string, path: string): string {
  const segs = path.split("/").map(encodeURIComponent).join("/");
  return `${apiBase()}/${repo}/raw/${encodeURIComponent(ref)}/${segs}`;
}

export class BackendOffline extends Error {
  constructor() {
    super("frieren backend unreachable");
  }
}
