package main

import (
	"net/http"
	"strings"
)

type Server struct {
	Store    *Store
	Users    *Users
	Token    string
	Throttle *throttle
}

// repoParam extracts the repository name from the route, accepting both
// /name and /name.git so one URL works in the browser and in git.
func repoParam(r *http.Request) string {
	return strings.TrimSuffix(r.PathValue("repo"), ".git")
}

func (srv *Server) handler() http.Handler {
	mux := http.NewServeMux()

	// Smart HTTP (git clients)
	mux.HandleFunc("GET /{repo}/info/refs", srv.infoRefs)
	mux.HandleFunc("POST /{repo}/git-upload-pack", srv.uploadPack)
	mux.HandleFunc("POST /{repo}/git-receive-pack", srv.receivePack)

	// Accounts
	mux.HandleFunc("GET /api/meta", srv.apiMeta)
	mux.HandleFunc("POST /api/auth/login", srv.apiLogin)
	mux.HandleFunc("GET /api/auth/session", srv.apiSession)
	mux.HandleFunc("POST /api/auth/password", srv.apiPassword)
	mux.HandleFunc("GET /api/auth/seats", srv.apiSeats)
	mux.HandleFunc("POST /api/auth/seats/claim", srv.apiClaimSeat)
	mux.HandleFunc("POST /api/auth/seats/release", srv.apiReleaseSeat)

	// JSON API (external frontends). Reads honour repository visibility;
	// the only write is the owner changing a repository's settings.
	mux.HandleFunc("GET /api/repos", srv.apiRepos)
	mux.HandleFunc("GET /api/repos/{repo}", srv.apiRepoInfo)
	mux.HandleFunc("POST /api/repos/{repo}/settings", srv.apiRepoSettings)
	mux.HandleFunc("GET /api/repos/{repo}/tree", srv.apiTree)
	mux.HandleFunc("GET /api/repos/{repo}/blob", srv.apiBlob)
	mux.HandleFunc("GET /api/repos/{repo}/readme", srv.apiReadme)
	mux.HandleFunc("GET /api/repos/{repo}/commits", srv.apiCommits)
	mux.HandleFunc("GET /api/repos/{repo}/commit/{hash}", srv.apiCommit)
	mux.HandleFunc("GET /api/repos/{repo}/refs", srv.apiRefs)

	// Web UI (browsers). This surface has no sign-in, so it shows only
	// public repositories — private work is visible on the frontend.
	mux.HandleFunc("GET /{$}", srv.indexPage)
	mux.HandleFunc("GET /static/style.css", srv.styleCSS)
	mux.HandleFunc("GET /{repo}", srv.repoPage)
	mux.HandleFunc("GET /{repo}/{$}", srv.repoPage)
	mux.HandleFunc("GET /{repo}/tree/{ref}", srv.treePage)
	mux.HandleFunc("GET /{repo}/tree/{ref}/{path...}", srv.treePage)
	mux.HandleFunc("GET /{repo}/blob/{ref}/{path...}", srv.blobPage)
	mux.HandleFunc("GET /{repo}/raw/{ref}/{path...}", srv.rawFile)
	mux.HandleFunc("GET /{repo}/commits", srv.commitsPage)
	mux.HandleFunc("GET /{repo}/commits/{ref}", srv.commitsPage)
	mux.HandleFunc("GET /{repo}/commit/{hash}", srv.commitPage)
	mux.HandleFunc("GET /{repo}/refs", srv.refsPage)

	return mux
}
