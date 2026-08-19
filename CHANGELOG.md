# Changelog

## v0.3.0 — 2026-08-18

- `web`: `/api/health` endpoint on the deployed site — reports whether the
  server-side fetch to the backend works and how fast; first stop when the
  offline card shows.
- First public release on GitHub. The reference deployment runs at
  [frieren.tenet.sh](https://frieren.tenet.sh), reading
  [git.tenet.sh](https://git.tenet.sh).

## v0.2.0 — 2026-08-18

- Read-only JSON API under `/api` for external frontends: repos, trees,
  blobs, READMEs, commit logs, single commits with patches, refs.
- `web/`: Next.js frontend — serif hero and repo grid, shiki-highlighted
  files, rendered READMEs (sanitized HTML, relative images rewritten to the
  raw endpoint), parsed per-file diffs with dual line numbers, graceful
  offline state.
- Raw endpoint serves real media content types so README images render.

## v0.1.0 — 2026-08-18

- Single-binary git server: smart HTTP clone/fetch for anyone, push gated
  behind the owner token, push-to-create repositories.
- Built-in read-only web UI: repo list, file trees, blobs, commits, diffs,
  refs.
- Zero dependencies beyond the Go standard library and the git binary.
- Deploy examples: hardened systemd unit, Caddyfile.
