// Shapes returned by the frieren backend. Kept free of server-only imports so
// client components can pull the types in without dragging `next/headers`
// into the browser bundle.

export type RepoInfo = {
  name: string;
  description: string;
  default: string;
  lastCommit: string;
  empty: boolean;
  private: boolean;
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

export type Ref = { name: string; short: string; when: string; subject: string };

export type Refs = { branches: Ref[]; tags: Ref[] };

// The archive's public identity.
export type Meta = { owner: string; version: string };

// What a form action hands back to its client component.
export type ActionState = { error?: string; ok?: string };

export type Viewer = {
  seat: number;
  username: string;
  name: string;
  owner: boolean;
  configured: boolean;
  passwordChangedAt?: string;
};
