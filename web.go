package main

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

//go:embed templates/*.html
var templateFS embed.FS

//go:embed static/style.css
var styleSheet []byte

var funcs = template.FuncMap{
	"pesc": url.PathEscape,
	"ago":  timeAgo,
	"size": byteSize,
}

var pages = template.Must(template.New("").Funcs(funcs).ParseFS(templateFS, "templates/*.html"))

func timeAgo(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	d := time.Since(t)
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		return fmt.Sprintf("%dm ago", int(d.Minutes()))
	case d < 24*time.Hour:
		return fmt.Sprintf("%dh ago", int(d.Hours()))
	case d < 30*24*time.Hour:
		return fmt.Sprintf("%dd ago", int(d.Hours()/24))
	default:
		return t.Format("Jan 2, 2006")
	}
}

func byteSize(n int64) string {
	switch {
	case n < 0:
		return ""
	case n < 1024:
		return fmt.Sprintf("%d B", n)
	case n < 1<<20:
		return fmt.Sprintf("%.1f KB", float64(n)/1024)
	default:
		return fmt.Sprintf("%.1f MB", float64(n)/(1<<20))
	}
}

func (srv *Server) render(w http.ResponseWriter, name string, data any) {
	var buf bytes.Buffer
	if err := pages.ExecuteTemplate(&buf, name, data); err != nil {
		log.Printf("render %s: %v", name, err)
		http.Error(w, "template error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	buf.WriteTo(w)
}

func (srv *Server) styleCSS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/css; charset=utf-8")
	w.Header().Set("Cache-Control", "max-age=3600")
	w.Write(styleSheet)
}

func baseURL(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	if p := r.Header.Get("X-Forwarded-Proto"); p != "" {
		scheme = p
	}
	return scheme + "://" + r.Host
}

// page is the data every template receives.
type page struct {
	Title    string
	Repo     *RepoInfo
	Ref      string
	Path     string
	CloneURL string
	Tab      string
	Base     string
}

func (srv *Server) newPage(r *http.Request, repo *RepoInfo, ref, tab string) page {
	p := page{Title: "frieren", Tab: tab, Base: baseURL(r)}
	if repo != nil {
		p.Repo = repo
		p.Ref = ref
		p.Title = repo.Name + " · frieren"
		p.CloneURL = baseURL(r) + "/" + repo.Name + ".git"
	}
	return p
}

// openRepo loads the repo named in the route or writes a 404. This surface
// has no sign-in, so private repositories are invisible here — they live
// behind the frontend, which does.
func (srv *Server) openRepo(w http.ResponseWriter, r *http.Request) *RepoInfo {
	info, err := srv.Store.open(repoParam(r))
	if err != nil || info.Private {
		srv.notFound(w, r)
		return nil
	}
	return info
}

func (srv *Server) notFound(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	srv.render(w, "notfound", page{Title: "not found · frieren"})
}

func (srv *Server) indexPage(w http.ResponseWriter, r *http.Request) {
	srv.render(w, "index", struct {
		page
		Repos []*RepoInfo
	}{srv.newPage(r, nil, "", ""), srv.Store.list(nil)})
}

func (srv *Server) repoPage(w http.ResponseWriter, r *http.Request) {
	repo := srv.openRepo(w, r)
	if repo == nil {
		return
	}
	data := struct {
		page
		Entries    []TreeEntry
		ReadmeName string
		Readme     string
	}{page: srv.newPage(r, repo, repo.Default, "files")}
	if !repo.Empty {
		entries, err := srv.Store.lsTree(r.Context(), repo.Name, repo.Default, "")
		if err == nil {
			data.Entries = entries
		}
		if name, body := srv.Store.readme(r.Context(), repo.Name, repo.Default); name != "" && !isBinary(body) {
			data.ReadmeName = name
			data.Readme = string(body)
		}
	}
	srv.render(w, "repo", data)
}

type crumb struct {
	Name string
	Path string
}

func crumbs(path string) []crumb {
	if path == "" {
		return nil
	}
	parts := strings.Split(path, "/")
	out := make([]crumb, len(parts))
	for i, part := range parts {
		out[i] = crumb{Name: part, Path: strings.Join(parts[:i+1], "/")}
	}
	return out
}

func (srv *Server) treePage(w http.ResponseWriter, r *http.Request) {
	repo := srv.openRepo(w, r)
	if repo == nil {
		return
	}
	ref, path := r.PathValue("ref"), r.PathValue("path")
	if !validRef(ref) || !validPath(path) {
		srv.notFound(w, r)
		return
	}
	entries, err := srv.Store.lsTree(r.Context(), repo.Name, ref, path)
	if err != nil {
		srv.notFound(w, r)
		return
	}
	srv.render(w, "tree", struct {
		page
		Entries []TreeEntry
		Crumbs  []crumb
		Dir     string
	}{srv.newPage(r, repo, ref, "files"), entries, crumbs(path), path})
}

func isBinary(b []byte) bool {
	if len(b) > 8000 {
		b = b[:8000]
	}
	return bytes.IndexByte(b, 0) >= 0
}

func (srv *Server) blobPage(w http.ResponseWriter, r *http.Request) {
	repo := srv.openRepo(w, r)
	if repo == nil {
		return
	}
	ref, path := r.PathValue("ref"), r.PathValue("path")
	if !validRef(ref) || !validPath(path) || path == "" {
		srv.notFound(w, r)
		return
	}
	blob, err := srv.Store.catBlob(r.Context(), repo.Name, ref, path)
	if err != nil {
		srv.notFound(w, r)
		return
	}
	all := crumbs(path)
	data := struct {
		page
		Parents   []crumb
		FileName  string
		RawPath   string
		Lines     []string
		Bytes     int64
		Binary    bool
		Truncated bool
	}{
		page:     srv.newPage(r, repo, ref, "files"),
		Parents:  all[:len(all)-1],
		FileName: all[len(all)-1].Name,
		RawPath:  path,
		Bytes:    int64(len(blob)),
	}
	switch {
	case isBinary(blob):
		data.Binary = true
	case len(blob) > maxBlobBytes:
		data.Truncated = true
	default:
		data.Lines = strings.Split(strings.TrimSuffix(string(blob), "\n"), "\n")
	}
	srv.render(w, "blob", data)
}

var rawTypes = map[string]string{
	".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
	".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
	".ico": "image/x-icon", ".avif": "image/avif", ".pdf": "application/pdf",
	".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg",
}

func extOf(path string) string {
	if i := strings.LastIndexByte(path, '.'); i >= 0 && !strings.ContainsRune(path[i:], '/') {
		return strings.ToLower(path[i:])
	}
	return ""
}

func (srv *Server) rawFile(w http.ResponseWriter, r *http.Request) {
	repo := srv.openRepo(w, r)
	if repo == nil {
		return
	}
	ref, path := r.PathValue("ref"), r.PathValue("path")
	if !validRef(ref) || !validPath(path) || path == "" {
		http.NotFound(w, r)
		return
	}
	blob, err := srv.Store.catBlob(r.Context(), repo.Name, ref, path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	// Never let the browser interpret repository content as HTML. Known
	// media types get their real content type so <img>/<video> embeds work.
	w.Header().Set("X-Content-Type-Options", "nosniff")
	switch {
	case rawTypes[extOf(path)] != "":
		w.Header().Set("Content-Type", rawTypes[extOf(path)])
	case isBinary(blob):
		w.Header().Set("Content-Type", "application/octet-stream")
	default:
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	}
	w.Write(blob)
}

func (srv *Server) commitsPage(w http.ResponseWriter, r *http.Request) {
	repo := srv.openRepo(w, r)
	if repo == nil {
		return
	}
	ref := r.PathValue("ref")
	if ref == "" {
		ref = repo.Default
	}
	if !validRef(ref) {
		srv.notFound(w, r)
		return
	}
	var commits []Commit
	if !repo.Empty {
		var err error
		commits, err = srv.Store.log(r.Context(), repo.Name, ref, 100)
		if err != nil {
			srv.notFound(w, r)
			return
		}
	}
	srv.render(w, "commits", struct {
		page
		Commits []Commit
	}{srv.newPage(r, repo, ref, "commits"), commits})
}

type diffLine struct {
	Class string
	Text  string
}

func classifyPatch(patch string) []diffLine {
	if patch == "" {
		return nil
	}
	lines := strings.Split(strings.TrimSuffix(patch, "\n"), "\n")
	out := make([]diffLine, len(lines))
	for i, l := range lines {
		class := "ctx"
		switch {
		case strings.HasPrefix(l, "diff --git") || strings.HasPrefix(l, "index ") ||
			strings.HasPrefix(l, "new file") || strings.HasPrefix(l, "deleted file") ||
			strings.HasPrefix(l, "similarity ") || strings.HasPrefix(l, "rename "):
			class = "meta"
		case strings.HasPrefix(l, "+++") || strings.HasPrefix(l, "---"):
			class = "file"
		case strings.HasPrefix(l, "@@"):
			class = "hunk"
		case strings.HasPrefix(l, "+"):
			class = "add"
		case strings.HasPrefix(l, "-"):
			class = "del"
		}
		out[i] = diffLine{Class: class, Text: l}
	}
	return out
}

func (srv *Server) commitPage(w http.ResponseWriter, r *http.Request) {
	repo := srv.openRepo(w, r)
	if repo == nil {
		return
	}
	hash := r.PathValue("hash")
	if !validRef(hash) {
		srv.notFound(w, r)
		return
	}
	commit, err := srv.Store.commit(r.Context(), repo.Name, hash)
	if err != nil {
		srv.notFound(w, r)
		return
	}
	patch, truncated, err := srv.Store.patch(r.Context(), repo.Name, commit.Hash)
	if err != nil {
		srv.notFound(w, r)
		return
	}
	srv.render(w, "commit", struct {
		page
		Commit    *Commit
		Diff      []diffLine
		Truncated bool
	}{srv.newPage(r, repo, "", "commits"), commit, classifyPatch(patch), truncated})
}

func (srv *Server) refsPage(w http.ResponseWriter, r *http.Request) {
	repo := srv.openRepo(w, r)
	if repo == nil {
		return
	}
	branches, _ := srv.Store.refs(r.Context(), repo.Name, "heads")
	tags, _ := srv.Store.refs(r.Context(), repo.Name, "tags")
	srv.render(w, "refs", struct {
		page
		Branches []Ref
		Tags     []Ref
	}{srv.newPage(r, repo, "", "refs"), branches, tags})
}
