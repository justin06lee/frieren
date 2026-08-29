<div align="center">

<img src="assets/frieren.svg" alt="frieren" width="460" />

# frieren

**A self-hosted git server in one binary — everyone reads what you publish, only you write.**<br>
*Your code, on your machine, outliving every platform.*

</div>

---

frieren is a small alternative to GitHub for people who want their repositories to live on hardware they own. It serves two audiences at once: git clients speak the smart HTTP protocol against it (`git clone`, `git fetch`, `git push`), and browsers get a web UI — repository list, file trees, blobs with line numbers, commit log, diffs, branches and tags.

The access model is deliberately tiny. **Guests** — anyone who can reach the server — browse and clone every *public* repository. **Seat holders** sign in and see everything, private repositories included. There are exactly two seats and no sign-up: one for the owner, one spare. Pushing is the owner's alone.

It is built from fundamentals: the Go standard library and the `git` binary, nothing else. frieren owns HTTP, authentication, and rendering; the wire protocol and object storage are delegated to git's own `upload-pack` and `receive-pack` plumbing — the same architecture real forges use.

## Quick start

Requires Go 1.24+ (for `crypto/pbkdf2`) and git.

```sh
make                       # builds and installs frieren to ~/.local/bin

frieren token              # generate an owner token, keep it secret
FRIEREN_TOKEN=<token> frieren serve
```

The server listens on `:7420` and stores bare repositories under `./repos`. On its first run it writes a seat file and prints who holds each seat:

```
seat 1: justin06lee (owner)
seat 2: unconfigured
```

The owner's starting password is `i love my wife`. **Change it** — from the frontend's settings page, or on the server with `frieren passwd justin06lee`. To bootstrap a different identity entirely, set `FRIEREN_OWNER` and `FRIEREN_PASSWORD` before that first run.

Publish a project to it:

```sh
git remote add frieren http://localhost:7420/myproject.git
git push frieren master
```

git asks for credentials: either your seat's username and password, or any username with the owner token as the password. A push to a repository that doesn't exist yet creates it — `frieren init <name> [description] [-private]` also works on the server. Then open http://localhost:7420 in a browser.

To avoid retyping the credential, let git store it once: `git config credential.helper osxkeychain` (macOS) or `git config credential.helper store` (Linux).

## Accounts

Two seats, no third, no sign-up form. Everyone else is a guest.

| | Guests | Seat holders | Owner |
|---|---|---|---|
| Browse and clone public repositories | ✅ | ✅ | ✅ |
| See and clone private repositories | — | ✅ | ✅ |
| Change a repository's visibility or description | — | — | ✅ |
| Configure or release the spare seat | — | — | ✅ |
| Push | — | — | ✅ |

Passwords are stored as PBKDF2-HMAC-SHA256 (600,000 iterations, per-account salt) in `<root>/.frieren/users.json`, mode `600`. Sessions are stateless HMAC-signed tokens: restarting the server doesn't sign anyone out, and changing a password immediately invalidates every session that password issued. Failed sign-ins are throttled per address.

There is no two-factor authentication, so the owner's password is the only thing standing between a stranger and the private repositories. Pick accordingly.

```sh
frieren users              # who holds each seat
frieren passwd <username>  # set a password without knowing the old one
```

## Repository visibility

Every repository is public unless marked otherwise, which is why nothing that existed before accounts changed hands. Visibility lives in a plain `visibility` file inside the bare repository, next to git's own `description`, so it's readable and editable over SSH.

A private repository disappears completely for guests: it's absent from the repository list, its API routes answer `404` rather than `403` so its very existence stays secret, the built-in web UI won't serve it, and `git clone` asks for credentials instead of handing over objects. Flip it from the repository's **Settings** tab, or create it that way with `frieren init <name> -private`.

Making a repository private can't recall clones people already have — rotate anything secret that was committed to it.

## Configuration

Flags to `frieren serve`, each with an environment fallback:

| Flag | Env | Default | |
|---|---|---|---|
| `-addr` | `FRIEREN_ADDR` | `:7420` | listen address |
| `-root` | `FRIEREN_ROOT` | `./repos` | directory of bare repositories |
| `-token` | `FRIEREN_TOKEN` | *(unset)* | owner token for pushing |

Two more are read only when the seat file is first created: `FRIEREN_OWNER` (default `justin06lee`) and `FRIEREN_PASSWORD`.

Repository descriptions shown in the UI come from the standard `description` file inside each bare repository.

## Deploying on your own machine

Build for the target machine and copy the binary over — it's fully static:

```sh
GOOS=linux GOARCH=amd64 go build -o frieren .
```

`deploy/frieren.service` is a hardened systemd unit (dedicated user, read-only filesystem except the repo root, token loaded from an env file its comments show how to create). The seat file lives under the repository root, so that single `ReadWritePaths` entry already covers it. `deploy/Caddyfile` puts automatic HTTPS in front:

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

Everything the web UI shows is also served as JSON under `/api`, so external frontends can build their own experience on top. Reads honour visibility: send a session token as `Authorization: Bearer <token>` (or the owner token over HTTP basic) to see private repositories. Refs and paths travel as query parameters, so branch names with slashes just work.

```
GET  /api/meta                           the archive's public identity
GET  /api/repos                          repositories the caller may see
GET  /api/repos/{name}                   one repository's info
GET  /api/repos/{name}/tree?ref=&path=   directory listing
GET  /api/repos/{name}/blob?ref=&path=   file content (text inline, binary flagged)
GET  /api/repos/{name}/readme?ref=       root README, if any
GET  /api/repos/{name}/commits?ref=&n=   commit log
GET  /api/repos/{name}/commit/{hash}     one commit with its patch
GET  /api/repos/{name}/refs              branches and tags
POST /api/repos/{name}/settings          visibility and description (owner)

POST /api/auth/login                     username + password → session token
GET  /api/auth/session                   who the caller is, if anyone
POST /api/auth/password                  change your own password
GET  /api/auth/seats                     both seats
POST /api/auth/seats/claim               configure the spare seat (owner)
POST /api/auth/seats/release             empty the spare seat (owner)
```

Omitting `ref` uses the repository's default branch.

## The frontend (`web/`)

`web/` is a Next.js app that reads that API and lays the archive out the way GitHub does: a profile page with the repository list, a repository header with Code / Commits / Branches / Tags / Settings tabs, a branch-and-tag switcher, syntax-highlighted files (shiki), rendered READMEs with working relative images, and per-file diffs with dual line numbers.

It fetches server-side, so the backend needs no CORS and its address stays out of the browser. Signing in stores one http-only cookie holding a backend session token; signed-in responses are never cached, so one visitor's private repositories can't be served to the next.

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

No issues, no pull requests, no code review, no CI. It hosts and shows git repositories, and stops there. Accounts exist to separate *public* from *private* and nothing more: there are two seats, one writer, and no way to grow that number without editing the source. If you need collaborators with write access, you want a full forge like Forgejo.

## Development

```sh
make test    # end-to-end suite: real clone/push roundtrips against a live server
make build   # binary in dist/
make web     # production build of the frontend
```
