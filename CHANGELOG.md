# Changelog

## v0.4.0 — 2026-08-28

- Accounts. Two seats, no sign-up: an owner and one spare the owner can
  configure. Guests read public repositories; seat holders read everything.
  Passwords are PBKDF2-HMAC-SHA256 with 600k iterations; sessions are
  stateless signed tokens that survive restarts and die when the password
  they were issued under changes. Sign-in attempts are throttled per address.
- Private repositories. Marked by a `visibility` file inside the bare repo.
  Private work is absent from the repository list, answers `404` on the API
  so its existence stays secret, is hidden from the built-in web UI, and
  refuses anonymous `git clone`.
- Pushing now accepts a seat's username and password as well as the owner
  token.
- New commands: `frieren users`, `frieren passwd <user>`, `frieren init
  -private`. New endpoints: `/api/meta`, `/api/auth/*`, repository settings.
- `web`: rebuilt front to back in GitHub's shape — profile page with the
  repository list and visibility filters, repository header with
  Code/Commits/Branches/Tags/Settings tabs, branch-and-tag switcher,
  commits grouped by day, GitHub-style diffs, sign-in, account settings with
  password change and seat management, per-repository settings. Poppins
  replaces the serif display face. Tags are browsable at last.
- HTTP server timeouts (`ReadHeaderTimeout`, `IdleTimeout`, `MaxHeaderBytes`).

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
