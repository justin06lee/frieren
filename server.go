package main

import (
	"net/http"
	"strings"
)

type Server struct {
	Store *Store
	Token string
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

	// JSON API (external frontends, read-only)
	mux.HandleFunc("GET /api/repos", srv.apiRepos)
	mux.HandleFunc("GET /api/repos/{repo}", srv.apiRepoInfo)
	mux.HandleFunc("GET /api/repos/{repo}/tree", srv.apiTree)
	mux.HandleFunc("GET /api/repos/{repo}/blob", srv.apiBlob)
	mux.HandleFunc("GET /api/repos/{repo}/readme", srv.apiReadme)
	mux.HandleFunc("GET /api/repos/{repo}/commits", srv.apiCommits)
	mux.HandleFunc("GET /api/repos/{repo}/commit/{hash}", srv.apiCommit)
	mux.HandleFunc("GET /api/repos/{repo}/refs", srv.apiRefs)

	// Web UI (browsers, read-only)
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
