import { apiBase, BackendOffline } from "./env";
import { sessionToken } from "./session";
import type {
  Blob,
  Commit,
  CommitDetail,
  Meta,
  Viewer,
  Readme,
  Refs,
  RepoInfo,
  TreeEntry,
} from "./types";

export { apiBase, cloneUrl, rawUrl, BackendOffline } from "./env";
export type * from "./types";

// api fetches a path as the current viewer, returning null on 404/400 and
// throwing BackendOffline when the backend is missing or unreachable.
//
// Signed-in responses are never cached: one visitor's private repositories
// must not be served to the next.
async function api<T>(path: string): Promise<T | null> {
  const base = apiBase();
  if (!base) throw new BackendOffline();
  const token = await sessionToken();

  let res: Response;
  try {
    res = await fetch(`${base}/api${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      ...(token ? { cache: "no-store" as const } : { next: { revalidate: 30 } }),
    });
  } catch {
    throw new BackendOffline();
  }
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new BackendOffline();
  return (await res.json()) as T;
}

const q = encodeURIComponent;

export const getMeta = () => api<Meta>("/meta");
export const getSeats = () => api<Viewer[]>("/auth/seats");
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
