package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const (
	ownerName = "justin06lee"
	ownerPass = "i love my wife"
)

// do sends a request with an optional bearer token and decodes the response.
func do(t *testing.T, method, url, bearer string, body, out any) int {
	t.Helper()
	var rdr *bytes.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		rdr = bytes.NewReader(b)
	} else {
		rdr = bytes.NewReader(nil)
	}
	req, err := http.NewRequest(method, url, rdr)
	if err != nil {
		t.Fatal(err)
	}
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if out != nil {
		json.NewDecoder(resp.Body).Decode(out)
	}
	return resp.StatusCode
}

// signIn logs the owner in and returns the session token.
func signIn(t *testing.T, base, user, pass string) string {
	t.Helper()
	var got sessionResponse
	if code := do(t, "POST", base+"/api/auth/login", "", map[string]string{"username": user, "password": pass}, &got); code != 200 {
		t.Fatalf("login as %s: code %d", user, code)
	}
	if got.Token == "" {
		t.Fatal("login returned no session token")
	}
	return got.Token
}

func TestSeatsBootstrap(t *testing.T) {
	ts, _, users := newTestServerWithUsers(t)

	seats := users.Seats()
	if len(seats) != 2 {
		t.Fatalf("want exactly 2 seats, got %d", len(seats))
	}
	if !seats[0].Configured || seats[0].Username != ownerName || !seats[0].Owner {
		t.Errorf("seat 1 = %+v, want configured owner %q", seats[0], ownerName)
	}
	if seats[1].Configured {
		t.Errorf("seat 2 = %+v, want unconfigured", seats[1])
	}

	// The seat file must never be world-readable, and must never carry a
	// plaintext password.
	fi, err := os.Stat(users.path)
	if err != nil {
		t.Fatal(err)
	}
	if perm := fi.Mode().Perm(); perm != 0o600 {
		t.Errorf("users.json mode = %o, want 600", perm)
	}
	raw, err := os.ReadFile(users.path)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(raw, []byte(ownerPass)) {
		t.Error("users.json contains the password in plaintext")
	}

	// A guest has no session.
	var guest sessionResponse
	if code := do(t, "GET", ts.URL+"/api/auth/session", "", nil, &guest); code != 200 || guest.User != nil {
		t.Errorf("guest session: code %d, user %+v", code, guest.User)
	}
}

func TestLoginRejectsBadCredentials(t *testing.T) {
	ts, _, _ := newTestServerWithUsers(t)

	var e map[string]string
	if code := do(t, "POST", ts.URL+"/api/auth/login", "", map[string]string{"username": ownerName, "password": "wrong"}, &e); code != 401 {
		t.Errorf("bad password: code %d, want 401", code)
	}
	if code := do(t, "POST", ts.URL+"/api/auth/login", "", map[string]string{"username": "nobody", "password": ownerPass}, &e); code != 401 {
		t.Errorf("unknown user: code %d, want 401", code)
	}
	// Both failures must read identically — no user enumeration.
	if !strings.Contains(e["error"], "incorrect username or password") {
		t.Errorf("error message leaks which field was wrong: %q", e["error"])
	}

	// The real credential still works, and identifies the owner.
	var ok sessionResponse
	if code := do(t, "POST", ts.URL+"/api/auth/login", "", map[string]string{"username": ownerName, "password": ownerPass}, &ok); code != 200 {
		t.Fatalf("valid login: code %d", code)
	}
	if ok.User == nil || !ok.User.Owner || ok.User.Username != ownerName {
		t.Fatalf("session user = %+v", ok.User)
	}

	// That token identifies the same person on a later request.
	var me sessionResponse
	if code := do(t, "GET", ts.URL+"/api/auth/session", ok.Token, nil, &me); code != 200 || me.User == nil || me.User.Username != ownerName {
		t.Errorf("session lookup: code %d, user %+v", code, me.User)
	}
	// A forged token does not.
	var forged sessionResponse
	if code := do(t, "GET", ts.URL+"/api/auth/session", "v1.aaaa.bbbb", nil, &forged); code != 200 || forged.User != nil {
		t.Errorf("forged token accepted: %+v", forged.User)
	}
}

// seed pushes a commit into a repository so it isn't empty.
func seed(t *testing.T, ts, repo string) {
	t.Helper()
	work := t.TempDir()
	mustGit(t, work, "clone", ts+"/"+repo+".git", "w")
	dir := filepath.Join(work, "w")
	os.WriteFile(filepath.Join(dir, "secret.txt"), []byte("classified\n"), 0o644)
	mustGit(t, dir, "add", ".")
	mustGit(t, dir, "commit", "-m", "seed")
	mustGit(t, dir, "push", withToken(t, ts+"/"+repo+".git"), "master")
}

func TestPrivateRepositoriesHideFromGuests(t *testing.T) {
	ts, store, _ := newTestServerWithUsers(t)
	for _, name := range []string{"openwork", "hidden"} {
		if err := store.create(name, name+" description"); err != nil {
			t.Fatal(err)
		}
		seed(t, ts.URL, name)
	}
	if err := store.setPrivate("hidden", true); err != nil {
		t.Fatal(err)
	}

	// Guest: one repository only.
	var guestRepos []RepoInfo
	if code := do(t, "GET", ts.URL+"/api/repos", "", nil, &guestRepos); code != 200 {
		t.Fatalf("guest repos: code %d", code)
	}
	if len(guestRepos) != 1 || guestRepos[0].Name != "openwork" {
		t.Fatalf("guest sees %+v, want only openwork", guestRepos)
	}

	// Guest: the private repo is a 404, not a 403 — its existence is secret.
	var e map[string]string
	if code := do(t, "GET", ts.URL+"/api/repos/hidden", "", nil, &e); code != 404 {
		t.Errorf("guest GET hidden: code %d, want 404", code)
	}
	for _, path := range []string{
		"/api/repos/hidden/tree", "/api/repos/hidden/blob?path=secret.txt",
		"/api/repos/hidden/commits", "/api/repos/hidden/refs", "/api/repos/hidden/readme",
	} {
		if code := do(t, "GET", ts.URL+path, "", nil, &e); code != 404 {
			t.Errorf("guest GET %s: code %d, want 404", path, code)
		}
	}

	// The built-in web UI has no sign-in, so it hides private work too.
	if code, _ := get(t, ts.URL+"/hidden"); code != http.StatusNotFound {
		t.Errorf("web UI GET /hidden = %d, want 404", code)
	}
	if code, body := get(t, ts.URL+"/"); code != 200 || strings.Contains(body, "hidden") {
		t.Errorf("web UI index lists the private repository")
	}

	// Signed in: both repositories, and the private one is readable.
	token := signIn(t, ts.URL, ownerName, ownerPass)
	var mine []RepoInfo
	if code := do(t, "GET", ts.URL+"/api/repos", token, nil, &mine); code != 200 || len(mine) != 2 {
		t.Fatalf("owner sees %d repos, want 2", len(mine))
	}
	var info RepoInfo
	if code := do(t, "GET", ts.URL+"/api/repos/hidden", token, nil, &info); code != 200 || !info.Private {
		t.Errorf("owner GET hidden: code %d, private %v", code, info.Private)
	}
	var blob blobResponse
	if code := do(t, "GET", ts.URL+"/api/repos/hidden/blob?path=secret.txt", token, nil, &blob); code != 200 || blob.Content != "classified\n" {
		t.Errorf("owner GET hidden blob: code %d, %q", code, blob.Content)
	}
}

func TestPrivateRepositoriesRefuseAnonymousClone(t *testing.T) {
	ts, store, _ := newTestServerWithUsers(t)
	if err := store.create("vault", "private things"); err != nil {
		t.Fatal(err)
	}
	seed(t, ts.URL, "vault")
	if err := store.setPrivate("vault", true); err != nil {
		t.Fatal(err)
	}

	work := t.TempDir()
	if out, err := gitCmd(t, work, "clone", ts.URL+"/vault.git", "anon"); err == nil {
		t.Fatalf("anonymous clone of a private repository succeeded:\n%s", out)
	}

	// The owner's token still clones it.
	mustGit(t, work, "clone", withToken(t, ts.URL+"/vault.git"), "byToken")
	got, err := os.ReadFile(filepath.Join(work, "byToken", "secret.txt"))
	if err != nil || string(got) != "classified\n" {
		t.Fatalf("authenticated clone content = %q, err %v", got, err)
	}

	// So does the owner's username and password.
	mustGit(t, work, "clone", withPassword(t, ts.URL+"/vault.git", ownerName, ownerPass), "byPassword")
	if _, err := os.Stat(filepath.Join(work, "byPassword", "secret.txt")); err != nil {
		t.Fatalf("password clone: %v", err)
	}
}

func TestPasswordChange(t *testing.T) {
	ts, _, _ := newTestServerWithUsers(t)
	token := signIn(t, ts.URL, ownerName, ownerPass)

	// The current password must be right.
	var e map[string]string
	if code := do(t, "POST", ts.URL+"/api/auth/password", token, map[string]string{"current": "nope", "next": "a-longer-secret"}, &e); code != 403 {
		t.Errorf("wrong current password: code %d, want 403", code)
	}
	// Short passwords are refused.
	if code := do(t, "POST", ts.URL+"/api/auth/password", token, map[string]string{"current": ownerPass, "next": "short"}, &e); code != 400 {
		t.Errorf("short password: code %d, want 400", code)
	}
	// Guests cannot change anyone's password.
	if code := do(t, "POST", ts.URL+"/api/auth/password", "", map[string]string{"current": ownerPass, "next": "a-longer-secret"}, &e); code != 401 {
		t.Errorf("guest password change: code %d, want 401", code)
	}

	// The real change succeeds and hands back a fresh session.
	var got sessionResponse
	if code := do(t, "POST", ts.URL+"/api/auth/password", token, map[string]string{"current": ownerPass, "next": "a-longer-secret"}, &got); code != 200 {
		t.Fatalf("password change: code %d", code)
	}
	if got.Token == "" || got.Token == token {
		t.Error("password change did not issue a new session token")
	}

	// The old session died with the old password; the new one works.
	var stale, fresh sessionResponse
	if do(t, "GET", ts.URL+"/api/auth/session", token, nil, &stale); stale.User != nil {
		t.Error("session issued under the old password still works")
	}
	if do(t, "GET", ts.URL+"/api/auth/session", got.Token, nil, &fresh); fresh.User == nil {
		t.Error("session issued by the password change does not work")
	}

	// Sign-in now needs the new password.
	if code := do(t, "POST", ts.URL+"/api/auth/login", "", map[string]string{"username": ownerName, "password": ownerPass}, &e); code != 401 {
		t.Errorf("old password still signs in: code %d", code)
	}
	signIn(t, ts.URL, ownerName, "a-longer-secret")
}

func TestSpareSeat(t *testing.T) {
	ts, _, _ := newTestServerWithUsers(t)
	token := signIn(t, ts.URL, ownerName, ownerPass)

	// Guests cannot claim it.
	var e map[string]string
	if code := do(t, "POST", ts.URL+"/api/auth/seats/claim", "", map[string]string{"username": "someone", "password": "a-longer-secret"}, &e); code != 403 {
		t.Errorf("guest claim: code %d, want 403", code)
	}

	// The owner configures the second seat, and it can then sign in.
	var seats []UserView
	if code := do(t, "POST", ts.URL+"/api/auth/seats/claim", token, map[string]string{"username": "mate", "name": "Second Seat", "password": "a-longer-secret"}, &seats); code != 200 {
		t.Fatalf("claim seat: code %d", code)
	}
	if len(seats) != 2 || !seats[1].Configured || seats[1].Username != "mate" || seats[1].Owner {
		t.Fatalf("seats after claim = %+v", seats)
	}
	mate := signIn(t, ts.URL, "mate", "a-longer-secret")

	// There is no third seat.
	if code := do(t, "POST", ts.URL+"/api/auth/seats/claim", token, map[string]string{"username": "third", "password": "a-longer-secret"}, &e); code != 400 {
		t.Errorf("third seat: code %d, want 400", code)
	}

	// A non-owner seat still reads private repositories but cannot change
	// repository settings or manage seats.
	if code := do(t, "POST", ts.URL+"/api/auth/seats/release", mate, map[string]string{"username": "mate"}, &e); code != 403 {
		t.Errorf("non-owner releasing a seat: code %d, want 403", code)
	}

	// The owner releases it again, and the credential stops working.
	if code := do(t, "POST", ts.URL+"/api/auth/seats/release", token, map[string]string{"username": "mate"}, &seats); code != 200 {
		t.Fatalf("release seat: code %d", code)
	}
	if seats[1].Configured {
		t.Error("released seat still configured")
	}
	if code := do(t, "POST", ts.URL+"/api/auth/login", "", map[string]string{"username": "mate", "password": "a-longer-secret"}, &e); code != 401 {
		t.Errorf("released seat still signs in: code %d", code)
	}
	// The owner's own seat can never be released.
	if code := do(t, "POST", ts.URL+"/api/auth/seats/release", token, map[string]string{"username": ownerName}, &e); code != 400 {
		t.Errorf("releasing the owner seat: code %d, want 400", code)
	}
}

func TestRepoSettings(t *testing.T) {
	ts, store, _ := newTestServerWithUsers(t)
	if err := store.create("project", "before"); err != nil {
		t.Fatal(err)
	}
	seed(t, ts.URL, "project")
	token := signIn(t, ts.URL, ownerName, ownerPass)

	// Guests cannot change settings.
	var e map[string]string
	if code := do(t, "POST", ts.URL+"/api/repos/project/settings", "", map[string]bool{"private": true}, &e); code != 403 {
		t.Fatalf("guest settings write: code %d, want 403", code)
	}
	if store.private("project") {
		t.Fatal("guest managed to make a repository private")
	}

	// The owner flips visibility and rewrites the description.
	var info RepoInfo
	body := map[string]any{"private": true, "description": "after"}
	if code := do(t, "POST", ts.URL+"/api/repos/project/settings", token, body, &info); code != 200 {
		t.Fatalf("owner settings write: code %d", code)
	}
	if !info.Private || info.Description != "after" {
		t.Fatalf("settings response = %+v", info)
	}
	if !store.private("project") {
		t.Error("visibility did not persist to disk")
	}

	// And flips it back.
	if code := do(t, "POST", ts.URL+"/api/repos/project/settings", token, map[string]any{"private": false}, &info); code != 200 || info.Private {
		t.Errorf("back to public: code %d, private %v", code, info.Private)
	}
	if code, _ := get(t, ts.URL+"/project"); code != 200 {
		t.Error("public again, but the web UI still hides it")
	}
}
