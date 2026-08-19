<div align="center">

<img src="assets/frieren.svg" alt="frieren" width="460" />

# frieren

**A self-hosted git server in one binary — everyone can read, only you can write.**<br>
*Your code, on your machine, outliving every platform.*

</div>

---

frieren is a small alternative to GitHub for people who want their repositories to live on hardware they own. It serves two audiences at once: git clients speak the smart HTTP protocol against it (`git clone`, `git fetch`, `git push`), and browsers get a read-only web UI — repository list, file trees, blobs with line numbers, commit log, diffs, branches and tags.

The access model is deliberately tiny. Anyone who can reach the server can browse and clone everything. Pushing requires a single owner token, sent as the password over HTTP basic auth. There are no accounts, no signup, no permissions matrix — one writer, the world as readers.

It is built from fundamentals: the Go standard library and the `git` binary, nothing else. frieren owns HTTP, authentication, and rendering; the wire protocol and object storage are delegated to git's own `upload-pack` and `receive-pack` plumbing — the same architecture real forges use.

## Quick start

Requires Go 1.22+ and git.

```sh
make                       # builds and installs frieren to ~/.local/bin

frieren token              # generate an owner token, keep it secret
FRIEREN_TOKEN=<token> frieren serve
```

The server listens on `:7420` and stores bare repositories under `./repos`. Publish a project to it:

```sh
git remote add frieren http://localhost:7420/myproject.git
git push frieren master
```

git asks for credentials: any username, the token as the password. A push to a repository that doesn't exist yet creates it — `frieren init <name> [description]` also works on the server. Then open http://localhost:7420 in a browser.

To avoid retyping the token, let git store it once: `git config credential.helper osxkeychain` (macOS) or `git config credential.helper store` (Linux).

## Configuration

Flags to `frieren serve`, each with an environment fallback:

| Flag | Env | Default | |
|---|---|---|---|
| `-addr` | `FRIEREN_ADDR` | `:7420` | listen address |
| `-root` | `FRIEREN_ROOT` | `./repos` | directory of bare repositories |
| `-token` | `FRIEREN_TOKEN` | *(unset)* | owner token; without one the server is read-only for everyone |

Repository descriptions shown in the UI come from the standard `description` file inside each bare repository.

## Deploying on your own machine

Build for the target machine and copy the binary over — it's fully static:

```sh
GOOS=linux GOARCH=amd64 go build -o frieren .
```

`deploy/frieren.service` is a hardened systemd unit (dedicated user, read-only filesystem except the repo root, token loaded from an env file its comments show how to create). `deploy/Caddyfile` puts automatic HTTPS in front:

```
git.example.com {
	reverse_proxy 127.0.0.1:7420
}
```

Point DNS at the machine, run Caddy, and `https://git.example.com` is your forge. If you'd rather not expose it publicly, run it inside a Tailscale network instead — every device of yours can reach it, nobody else can.

Since this machine becomes the source of truth, back the repo root up somewhere else on a schedule, e.g. a nightly cron:

```sh
rsync -a /srv/frieren/repos/ backup-host:frieren-repos/
```

## JSON API

Everything the web UI shows is also served as JSON under `/api`, so external frontends can build their own experience on top. Same access model: world-readable, nothing writes. Refs and paths travel as query parameters, so branch names with slashes just work.

```
GET /api/repos                          all repositories
GET /api/repos/{name}                   one repository's info
GET /api/repos/{name}/tree?ref=&path=   directory listing
GET /api/repos/{name}/blob?ref=&path=   file content (text inline, binary flagged)
GET /api/repos/{name}/readme?ref=       root README, if any
GET /api/repos/{name}/commits?ref=&n=   commit log
GET /api/repos/{name}/commit/{hash}     one commit with its patch
GET /api/repos/{name}/refs              branches and tags
```

Omitting `ref` uses the repository's default branch.

## The frontend (`web/`)

`web/` is a Next.js app that reads that API and turns the archive into a designed reading experience — serif hero, syntax-highlighted files (shiki), rendered READMEs with working relative images, per-file diff views with dual line numbers. It fetches server-side, so the backend needs no CORS and its address stays out of the browser.

```sh
cd web
bun install
FRIEREN_API_URL=http://localhost:7420 bun dev
```

It deploys anywhere Next.js runs; on Vercel, set two things on the project:

- `FRIEREN_API_URL` — the public URL of your frieren backend (e.g. `https://git.example.com`)
- `FRIEREN_CLONE_URL` — optional; shown in clone commands when it differs from the API URL

Until the backend is reachable, the site renders a graceful "archive unreachable" state with setup instructions, and recovers on its own once the server answers. `/api/health` on the deployed site reports whether it can reach the backend and how fast — the first place to look if the offline card ever shows.

## What it deliberately isn't

No issues, no pull requests, no user accounts, no markdown rendering yet — it hosts and shows git repositories, and stops there. The single-writer model is the point: if you need collaborators with write access, you want a full forge like Forgejo.

## Development

```sh
make test    # end-to-end suite: real clone/push roundtrips against a live server
make build   # binary in dist/
```
