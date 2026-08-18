// Server-side client for the frieren backend's read-only JSON API.

export type RepoInfo = {
  name: string;
  description: string;
  default: string;
  lastCommit: string;
  empty: boolean;
};

export type TreeEntry = {
  mode: string;
  type: "blob" | "tree" | "commit";
  hash: string;
  size: number;
  name: string;
};

export type Blob = {
  path: string;
  size: number;
  binary: boolean;
  truncated: boolean;
  content: string;
};

export type Readme = { name: string; content: string };

export type Commit = {
  hash: string;
  short: string;
  author: string;
  when: string;
  subject: string;
};

export type CommitDetail = Commit & { patch: string; truncated: boolean };

export type Refs = {
  branches: { name: string; short: string; when: string; subject: string }[];
  tags: { name: string; short: string; when: string; subject: string }[];
};

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

// api fetches a path, returning null on 404/400 and throwing BackendOffline
// when the backend is missing or unreachable.
async function api<T>(path: string): Promise<T | null> {
  const base = apiBase();
  if (!base) throw new BackendOffline();
  let res: Response;
  try {
    res = await fetch(`${base}/api${path}`, { next: { revalidate: 30 } });
  } catch {
    throw new BackendOffline();
  }
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new BackendOffline();
  return (await res.json()) as T;
}

const q = encodeURIComponent;

export const getRepos = () => api<RepoInfo[]>("/repos");
export const getRepo = (repo: string) => api<RepoInfo>(`/repos/${q(repo)}`);
export const getTree = (repo: string, ref: string, path: string) =>
  api<TreeEntry[]>(`/repos/${q(repo)}/tree?ref=${q(ref)}&path=${q(path)}`);
export const getBlob = (repo: string, ref: string, path: string) =>
  api<Blob>(`/repos/${q(repo)}/blob?ref=${q(ref)}&path=${q(path)}`);
export const getReadme = (repo: string, ref: string) =>
  api<Readme>(`/repos/${q(repo)}/readme?ref=${q(ref)}`);
export const getCommits = (repo: string, ref: string, n = 100) =>
  api<Commit[]>(`/repos/${q(repo)}/commits?ref=${q(ref)}&n=${n}`);
export const getCommit = (repo: string, hash: string) =>
  api<CommitDetail>(`/repos/${q(repo)}/commit/${q(hash)}`);
export const getRefs = (repo: string) => api<Refs>(`/repos/${q(repo)}/refs`);
