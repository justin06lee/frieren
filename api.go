package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
)

// Read-only JSON API for external frontends. Same access model as the rest
// of the server: everything here is world-readable, nothing writes.

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode json: %v", err)
	}
}

func apiError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func (srv *Server) apiRepo(w http.ResponseWriter, r *http.Request) *RepoInfo {
	info, err := srv.Store.open(repoParam(r))
	if err != nil {
		apiError(w, http.StatusNotFound, "no such repository")
		return nil
	}
	return info
}

// refParam returns the requested ref, falling back to the repo default,
// or writes a 400 and returns "" when the ref is malformed.
func refParam(w http.ResponseWriter, r *http.Request, repo *RepoInfo) string {
	ref := r.URL.Query().Get("ref")
	if ref == "" {
		ref = repo.Default
	}
	if !validRef(ref) {
		apiError(w, http.StatusBadRequest, "invalid ref")
		return ""
	}
	return ref
}

func (srv *Server) apiRepos(w http.ResponseWriter, r *http.Request) {
	repos := srv.Store.list()
	if repos == nil {
		repos = []*RepoInfo{}
	}
	writeJSON(w, repos)
}

func (srv *Server) apiRepoInfo(w http.ResponseWriter, r *http.Request) {
	repo := srv.apiRepo(w, r)
	if repo == nil {
		return
	}
	writeJSON(w, repo)
}

func (srv *Server) apiTree(w http.ResponseWriter, r *http.Request) {
	repo := srv.apiRepo(w, r)
	if repo == nil {
		return
	}
	ref := refParam(w, r, repo)
	if ref == "" {
		return
	}
	path := r.URL.Query().Get("path")
	if !validPath(path) {
		apiError(w, http.StatusBadRequest, "invalid path")
		return
	}
	entries, err := srv.Store.lsTree(r.Context(), repo.Name, ref, path)
	if err != nil {
		apiError(w, http.StatusNotFound, "no such tree")
		return
	}
	writeJSON(w, entries)
}

type blobResponse struct {
	Path      string `json:"path"`
	Size      int64  `json:"size"`
	Binary    bool   `json:"binary"`
	Truncated bool   `json:"truncated"`
	Content   string `json:"content"`
}

func (srv *Server) apiBlob(w http.ResponseWriter, r *http.Request) {
	repo := srv.apiRepo(w, r)
	if repo == nil {
		return
	}
	ref := refParam(w, r, repo)
	if ref == "" {
		return
	}
	path := r.URL.Query().Get("path")
	if !validPath(path) || path == "" {
		apiError(w, http.StatusBadRequest, "invalid path")
		return
	}
	blob, err := srv.Store.catBlob(r.Context(), repo.Name, ref, path)
	if err != nil {
		apiError(w, http.StatusNotFound, "no such blob")
		return
	}
	resp := blobResponse{Path: path, Size: int64(len(blob))}
	switch {
	case isBinary(blob):
		resp.Binary = true
	case len(blob) > maxBlobBytes:
		resp.Truncated = true
	default:
		resp.Content = string(blob)
	}
	writeJSON(w, resp)
}

type readmeResponse struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

func (srv *Server) apiReadme(w http.ResponseWriter, r *http.Request) {
	repo := srv.apiRepo(w, r)
	if repo == nil {
		return
	}
	ref := refParam(w, r, repo)
	if ref == "" {
		return
	}
	name, body := srv.Store.readme(r.Context(), repo.Name, ref)
	if name == "" || isBinary(body) {
		apiError(w, http.StatusNotFound, "no readme")
		return
	}
	writeJSON(w, readmeResponse{Name: name, Content: string(body)})
}

func (srv *Server) apiCommits(w http.ResponseWriter, r *http.Request) {
	repo := srv.apiRepo(w, r)
	if repo == nil {
		return
	}
	if repo.Empty {
		writeJSON(w, []Commit{})
		return
	}
	ref := refParam(w, r, repo)
	if ref == "" {
		return
	}
	limit := 100
	if n, err := strconv.Atoi(r.URL.Query().Get("n")); err == nil && n > 0 && n <= 500 {
		limit = n
	}
	commits, err := srv.Store.log(r.Context(), repo.Name, ref, limit)
	if err != nil {
		apiError(w, http.StatusNotFound, "no such ref")
		return
	}
	if commits == nil {
		commits = []Commit{}
	}
	writeJSON(w, commits)
}

type commitResponse struct {
	Commit
	Patch     string `json:"patch"`
	Truncated bool   `json:"truncated"`
}

func (srv *Server) apiCommit(w http.ResponseWriter, r *http.Request) {
	repo := srv.apiRepo(w, r)
	if repo == nil {
		return
	}
	hash := r.PathValue("hash")
	if !validRef(hash) {
		apiError(w, http.StatusBadRequest, "invalid hash")
		return
	}
	commit, err := srv.Store.commit(r.Context(), repo.Name, hash)
	if err != nil {
		apiError(w, http.StatusNotFound, "no such commit")
		return
	}
	patch, truncated, err := srv.Store.patch(r.Context(), repo.Name, commit.Hash)
	if err != nil {
		apiError(w, http.StatusInternalServerError, "patch failed")
		return
	}
	writeJSON(w, commitResponse{Commit: *commit, Patch: patch, Truncated: truncated})
}

func (srv *Server) apiRefs(w http.ResponseWriter, r *http.Request) {
	repo := srv.apiRepo(w, r)
	if repo == nil {
		return
	}
	branches, _ := srv.Store.refs(r.Context(), repo.Name, "heads")
	tags, _ := srv.Store.refs(r.Context(), repo.Name, "tags")
	if branches == nil {
		branches = []Ref{}
	}
	if tags == nil {
		tags = []Ref{}
	}
	writeJSON(w, map[string][]Ref{"branches": branches, "tags": tags})
}
