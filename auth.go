package main

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Two credentials reach this server. Git clients send the owner token (or a
// seat password) as HTTP Basic; the frontend sends a session token as a
// bearer. Both resolve to the same thing: a viewer, or nil for a guest.

// tokenMatches reports whether s is the configured owner token.
func (srv *Server) tokenMatches(s string) bool {
	if srv.Token == "" {
		return false
	}
	want := sha256.Sum256([]byte(srv.Token))
	got := sha256.Sum256([]byte(s))
	return subtle.ConstantTimeCompare(want[:], got[:]) == 1
}

// viewer resolves the caller's identity, or nil when they are a guest.
func (srv *Server) viewer(r *http.Request) *User {
	if srv.Users == nil {
		return nil
	}
	h := r.Header.Get("Authorization")
	if tok, ok := strings.CutPrefix(h, "Bearer "); ok {
		return srv.Users.Verify(strings.TrimSpace(tok))
	}
	user, pass, ok := r.BasicAuth()
	if !ok {
		return nil
	}
	// The owner token stands in for the owner's seat, so git clients that
	// already carry it never pay the password-derivation cost.
	if srv.tokenMatches(pass) {
		if owner := srv.Users.Owner(); owner != nil {
			return owner
		}
	}
	if u, err := srv.Users.Authenticate(user, pass); err == nil {
		return u
	}
	return nil
}

// canSee reports whether a viewer may read a repository at all.
func canSee(repo *RepoInfo, viewer *User) bool {
	return repo != nil && (!repo.Private || viewer != nil)
}

// ——— login throttling ———
//
// Passwords are the weakest credential the server accepts, so failed attempts
// from one address are slowed down. Successful logins clear the counter.

type throttle struct {
	mu   sync.Mutex
	fail map[string][]time.Time
}

const (
	throttleWindow = 15 * time.Minute
	throttleMax    = 10
)

func newThrottle() *throttle { return &throttle{fail: map[string][]time.Time{}} }

func clientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		if first, _, ok := strings.Cut(fwd, ","); ok {
			return strings.TrimSpace(first)
		}
		return strings.TrimSpace(fwd)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func (t *throttle) blocked(key string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	cutoff := time.Now().Add(-throttleWindow)
	kept := t.fail[key][:0]
	for _, at := range t.fail[key] {
		if at.After(cutoff) {
			kept = append(kept, at)
		}
	}
	t.fail[key] = kept
	return len(kept) >= throttleMax
}

func (t *throttle) record(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.fail[key] = append(t.fail[key], time.Now())
}

func (t *throttle) clear(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.fail, key)
}

// ——— handlers ———

// readJSON decodes a bounded request body.
func readJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		apiError(w, http.StatusBadRequest, "malformed request body")
		return false
	}
	return true
}

type sessionResponse struct {
	User    *UserView `json:"user"`
	Token   string    `json:"token,omitempty"`
	Expires time.Time `json:"expires,omitempty"`
}

func (srv *Server) seatOf(u *User) int {
	for i, s := range srv.Users.Seats() {
		if strings.EqualFold(s.Username, u.Username) {
			return i + 1
		}
	}
	return 0
}

func (srv *Server) apiLogin(w http.ResponseWriter, r *http.Request) {
	var req struct{ Username, Password string }
	if !readJSON(w, r, &req) {
		return
	}
	key := clientIP(r)
	if srv.Throttle.blocked(key) {
		apiError(w, http.StatusTooManyRequests, "too many failed sign-in attempts — wait a few minutes")
		return
	}
	u, err := srv.Users.Authenticate(strings.TrimSpace(req.Username), req.Password)
	if err != nil {
		srv.Throttle.record(key)
		// Never reveal which half of the pair was wrong.
		apiError(w, http.StatusUnauthorized, "incorrect username or password")
		return
	}
	srv.Throttle.clear(key)
	view := u.view(srv.seatOf(u))
	writeJSON(w, sessionResponse{User: &view, Token: srv.Users.Issue(u), Expires: time.Now().Add(sessionTTL)})
}

// apiMeta is the archive's public identity — enough for a frontend to render
// a profile for guests, and nothing more.
func (srv *Server) apiMeta(w http.ResponseWriter, r *http.Request) {
	meta := struct {
		Owner   string `json:"owner"`
		Version string `json:"version"`
	}{Version: version}
	if srv.Users != nil {
		if owner := srv.Users.Owner(); owner != nil {
			meta.Owner = owner.Username
		}
	}
	writeJSON(w, meta)
}

func (srv *Server) apiSession(w http.ResponseWriter, r *http.Request) {
	u := srv.viewer(r)
	if u == nil {
		writeJSON(w, sessionResponse{})
		return
	}
	view := u.view(srv.seatOf(u))
	writeJSON(w, sessionResponse{User: &view})
}

func (srv *Server) apiPassword(w http.ResponseWriter, r *http.Request) {
	u := srv.viewer(r)
	if u == nil {
		apiError(w, http.StatusUnauthorized, "sign in first")
		return
	}
	var req struct{ Current, Next string }
	if !readJSON(w, r, &req) {
		return
	}
	if err := srv.Users.ChangePassword(u.Username, req.Current, req.Next); err != nil {
		switch err {
		case errBadPassword:
			apiError(w, http.StatusForbidden, "current password is incorrect")
		case errShortPass:
			apiError(w, http.StatusBadRequest, err.Error())
		default:
			apiError(w, http.StatusInternalServerError, "could not change password")
		}
		return
	}
	// The old session's fingerprint is stale now — hand back a fresh one so
	// changing your password doesn't sign you out of the tab you're using.
	view := u.view(srv.seatOf(u))
	writeJSON(w, sessionResponse{User: &view, Token: srv.Users.Issue(u), Expires: time.Now().Add(sessionTTL)})
}

func (srv *Server) apiSeats(w http.ResponseWriter, r *http.Request) {
	u := srv.viewer(r)
	if u == nil {
		apiError(w, http.StatusUnauthorized, "sign in first")
		return
	}
	writeJSON(w, srv.Users.Seats())
}

func (srv *Server) apiClaimSeat(w http.ResponseWriter, r *http.Request) {
	u := srv.viewer(r)
	if u == nil || !u.Owner {
		apiError(w, http.StatusForbidden, "only the owner configures the spare seat")
		return
	}
	var req struct{ Username, Name, Password string }
	if !readJSON(w, r, &req) {
		return
	}
	if err := srv.Users.ClaimSeat(strings.TrimSpace(req.Username), strings.TrimSpace(req.Name), req.Password); err != nil {
		apiError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, srv.Users.Seats())
}

func (srv *Server) apiReleaseSeat(w http.ResponseWriter, r *http.Request) {
	u := srv.viewer(r)
	if u == nil || !u.Owner {
		apiError(w, http.StatusForbidden, "only the owner manages seats")
		return
	}
	var req struct{ Username string }
	if !readJSON(w, r, &req) {
		return
	}
	if err := srv.Users.ReleaseSeat(strings.TrimSpace(req.Username)); err != nil {
		apiError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, srv.Users.Seats())
}

// apiRepoSettings updates a repository's visibility and description.
func (srv *Server) apiRepoSettings(w http.ResponseWriter, r *http.Request) {
	viewer := srv.viewer(r)
	if viewer == nil || !viewer.Owner {
		apiError(w, http.StatusForbidden, "only the owner changes repository settings")
		return
	}
	name := repoParam(r)
	if _, err := srv.Store.open(name); err != nil {
		apiError(w, http.StatusNotFound, "no such repository")
		return
	}
	var req struct {
		Private     *bool   `json:"private"`
		Description *string `json:"description"`
	}
	if !readJSON(w, r, &req) {
		return
	}
	if req.Private != nil {
		if err := srv.Store.setPrivate(name, *req.Private); err != nil {
			apiError(w, http.StatusInternalServerError, "could not change visibility")
			return
		}
	}
	if req.Description != nil {
		if err := srv.Store.setDescription(name, *req.Description); err != nil {
			apiError(w, http.StatusInternalServerError, "could not change description")
			return
		}
	}
	info, err := srv.Store.open(name)
	if err != nil {
		apiError(w, http.StatusInternalServerError, "could not reload repository")
		return
	}
	writeJSON(w, info)
}
