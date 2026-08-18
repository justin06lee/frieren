package main

import (
	"compress/gzip"
	"crypto/sha256"
	"crypto/subtle"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
)

// Smart HTTP endpoints. frieren speaks just enough of the transport to route
// and authenticate, then hands the byte stream to git's own plumbing:
//
//	GET  /{repo}(.git)/info/refs?service=git-upload-pack   → ref advertisement (anonymous)
//	POST /{repo}(.git)/git-upload-pack                     → clone/fetch (anonymous)
//	GET  /{repo}(.git)/info/refs?service=git-receive-pack  → push advertisement (owner only)
//	POST /{repo}(.git)/git-receive-pack                    → push (owner only)
//
// A push to a repository that doesn't exist yet creates it (owner only).

func pktLine(s string) string {
	return fmt.Sprintf("%04x%s", len(s)+4, s)
}

// authorized reports whether the request carries the owner token as the HTTP
// Basic password. The username is ignored. With no token configured the
// server is read-only for everyone, owner included.
func (srv *Server) authorized(r *http.Request) bool {
	if srv.Token == "" {
		return false
	}
	_, pass, ok := r.BasicAuth()
	if !ok {
		return false
	}
	want := sha256.Sum256([]byte(srv.Token))
	got := sha256.Sum256([]byte(pass))
	return subtle.ConstantTimeCompare(want[:], got[:]) == 1
}

func requireAuth(w http.ResponseWriter) {
	w.Header().Set("WWW-Authenticate", `Basic realm="frieren"`)
	http.Error(w, "authentication required", http.StatusUnauthorized)
}

// ensureRepo resolves the repo for a push, creating it on first push.
func (srv *Server) ensureRepo(w http.ResponseWriter, name string) bool {
	if srv.Store.exists(name) {
		return true
	}
	if !validRepoName(name) {
		http.Error(w, "invalid repository name", http.StatusBadRequest)
		return false
	}
	if err := srv.Store.create(name, ""); err != nil {
		log.Printf("create %s: %v", name, err)
		http.Error(w, "could not create repository", http.StatusInternalServerError)
		return false
	}
	log.Printf("created repository %s.git", name)
	return true
}

func (srv *Server) infoRefs(w http.ResponseWriter, r *http.Request) {
	name := repoParam(r)
	service := r.URL.Query().Get("service")
	switch service {
	case "git-upload-pack":
		if !srv.Store.exists(name) {
			http.NotFound(w, r)
			return
		}
	case "git-receive-pack":
		if !srv.authorized(r) {
			requireAuth(w)
			return
		}
		if !srv.ensureRepo(w, name) {
			return
		}
	default:
		http.Error(w, "smart HTTP only", http.StatusForbidden)
		return
	}

	sub := service[len("git-"):]
	cmd := exec.CommandContext(r.Context(), "git", sub, "--stateless-rpc", "--advertise-refs", srv.Store.repoPath(name))
	cmd.Env = gitEnv(r)
	out, err := cmd.Output()
	if err != nil {
		log.Printf("%s advertise %s: %v", sub, name, err)
		http.Error(w, "git error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/x-"+service+"-advertisement")
	w.Header().Set("Cache-Control", "no-cache")
	io.WriteString(w, pktLine("# service="+service+"\n"))
	io.WriteString(w, "0000")
	w.Write(out)
}

func (srv *Server) uploadPack(w http.ResponseWriter, r *http.Request) {
	name := repoParam(r)
	if !srv.Store.exists(name) {
		http.NotFound(w, r)
		return
	}
	srv.serviceRPC(w, r, name, "upload-pack")
}

func (srv *Server) receivePack(w http.ResponseWriter, r *http.Request) {
	name := repoParam(r)
	if !srv.authorized(r) {
		requireAuth(w)
		return
	}
	if !srv.ensureRepo(w, name) {
		return
	}
	srv.serviceRPC(w, r, name, "receive-pack")
}

func (srv *Server) serviceRPC(w http.ResponseWriter, r *http.Request, name, sub string) {
	body := io.Reader(r.Body)
	if r.Header.Get("Content-Encoding") == "gzip" {
		gz, err := gzip.NewReader(body)
		if err != nil {
			http.Error(w, "bad gzip body", http.StatusBadRequest)
			return
		}
		defer gz.Close()
		body = gz
	}

	cmd := exec.CommandContext(r.Context(), "git", sub, "--stateless-rpc", srv.Store.repoPath(name))
	cmd.Env = gitEnv(r)
	cmd.Stdin = body
	cmd.Stderr = os.Stderr

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		http.Error(w, "git error", http.StatusInternalServerError)
		return
	}
	if err := cmd.Start(); err != nil {
		log.Printf("%s %s: %v", sub, name, err)
		http.Error(w, "git error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/x-git-"+sub+"-result")
	w.Header().Set("Cache-Control", "no-cache")
	io.Copy(newFlushWriter(w), stdout)
	if err := cmd.Wait(); err != nil {
		// Headers are already sent; all we can do is log.
		log.Printf("%s %s: %v", sub, name, err)
	}
}

// gitEnv forwards the client's Git-Protocol header so protocol v2 works.
func gitEnv(r *http.Request) []string {
	env := os.Environ()
	if p := r.Header.Get("Git-Protocol"); p != "" {
		env = append(env, "GIT_PROTOCOL="+p)
	}
	return env
}

type flushWriter struct {
	w io.Writer
	f http.Flusher
}

func newFlushWriter(w http.ResponseWriter) io.Writer {
	if f, ok := w.(http.Flusher); ok {
		return &flushWriter{w: w, f: f}
	}
	return w
}

func (fw *flushWriter) Write(p []byte) (int, error) {
	n, err := fw.w.Write(p)
	fw.f.Flush()
	return n, err
}
