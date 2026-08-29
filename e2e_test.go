package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

const testToken = "e2e-test-token"

func newTestServer(t *testing.T) (*httptest.Server, *Store) {
	ts, store, _ := newTestServerWithUsers(t)
	return ts, store
}

// newTestServerWithUsers builds a server with a freshly bootstrapped seat
// file. Password derivation is turned down so the suite stays quick.
func newTestServerWithUsers(t *testing.T) (*httptest.Server, *Store, *Users) {
	t.Helper()
	old := pbkdfIter
	pbkdfIter = 1000
	t.Cleanup(func() { pbkdfIter = old })
	// Bootstrap must see the built-in defaults, not the developer's shell.
	t.Setenv("FRIEREN_OWNER", "")
	t.Setenv("FRIEREN_PASSWORD", "")

	root := t.TempDir()
	users, err := LoadUsers(filepath.Join(root, ".frieren", "users.json"))
	if err != nil {
		t.Fatal(err)
	}
	store := &Store{Root: root}
	srv := &Server{Store: store, Users: users, Token: testToken, Throttle: newThrottle()}
	ts := httptest.NewServer(srv.handler())
	t.Cleanup(ts.Close)
	return ts, store, users
}

// gitCmd runs git isolated from the developer's global config and credentials.
func gitCmd(t *testing.T, dir string, args ...string) (string, error) {
	t.Helper()
	base := []string{"-c", "user.name=e2e", "-c", "user.email=e2e@test", "-c", "init.defaultBranch=master"}
	cmd := exec.Command("git", append(base, args...)...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(),
		"GIT_TERMINAL_PROMPT=0",
		"GIT_CONFIG_GLOBAL=/dev/null",
		"GIT_CONFIG_SYSTEM=/dev/null",
		"GIT_ASKPASS=/usr/bin/false",
	)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

func mustGit(t *testing.T, dir string, args ...string) string {
	t.Helper()
	out, err := gitCmd(t, dir, args...)
	if err != nil {
		t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, out)
	}
	return out
}

// withToken embeds the owner token as basic-auth credentials in a clone URL.
func withToken(t *testing.T, raw string) string {
	t.Helper()
	return withPassword(t, raw, "owner", testToken)
}

// withPassword embeds a seat's own credentials in a clone URL.
func withPassword(t *testing.T, raw, user, pass string) string {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	u.User = url.UserPassword(user, pass)
	return u.String()
}

func get(t *testing.T, url string) (int, string) {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(body)
}

func TestCloneAndPushRoundtrip(t *testing.T) {
	ts, store := newTestServer(t)
	if err := store.create("demo", "a test repository"); err != nil {
		t.Fatal(err)
	}

	work := t.TempDir()
	mustGit(t, work, "clone", ts.URL+"/demo.git", "clone1")
	clone1 := filepath.Join(work, "clone1")

	if err := os.WriteFile(filepath.Join(clone1, "hello.txt"), []byte("hello from frieren\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	mustGit(t, clone1, "add", "hello.txt")
	mustGit(t, clone1, "commit", "-m", "add hello")

	// Push without the token must be rejected.
	if out, err := gitCmd(t, clone1, "push", "origin", "master"); err == nil {
		t.Fatalf("anonymous push succeeded, want auth failure:\n%s", out)
	}

	// Push with the token must land.
	mustGit(t, clone1, "push", withToken(t, ts.URL+"/demo.git"), "master")

	// A fresh anonymous clone sees the pushed content.
	mustGit(t, work, "clone", ts.URL+"/demo.git", "clone2")
	got, err := os.ReadFile(filepath.Join(work, "clone2", "hello.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "hello from frieren\n" {
		t.Fatalf("clone content = %q", got)
	}
}

func TestPushToCreate(t *testing.T) {
	ts, store := newTestServer(t)

	work := t.TempDir()
	mustGit(t, work, "init", "fresh")
	dir := filepath.Join(work, "fresh")
	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("a\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	mustGit(t, dir, "add", ".")
	mustGit(t, dir, "commit", "-m", "first")

	// Creating a repo anonymously must fail.
	if out, err := gitCmd(t, dir, "push", ts.URL+"/newrepo.git", "master"); err == nil {
		t.Fatalf("anonymous push-to-create succeeded:\n%s", out)
	}
	if store.exists("newrepo") {
		t.Fatal("repository created by unauthenticated push")
	}

	// With the token the repository springs into existence.
	mustGit(t, dir, "push", withToken(t, ts.URL+"/newrepo.git"), "master")
	if !store.exists("newrepo") {
		t.Fatal("push-to-create did not create the repository")
	}

	// Invalid names never become directories.
	if out, err := gitCmd(t, dir, "push", withToken(t, ts.URL+"/.hidden.git"), "master"); err == nil {
		t.Fatalf("push to invalid repo name succeeded:\n%s", out)
	}
}

func TestWebPages(t *testing.T) {
	ts, store := newTestServer(t)
	if err := store.create("site", "web smoke test"); err != nil {
		t.Fatal(err)
	}

	work := t.TempDir()
	mustGit(t, work, "clone", ts.URL+"/site.git", "w")
	dir := filepath.Join(work, "w")
	os.MkdirAll(filepath.Join(dir, "docs"), 0o755)
	os.WriteFile(filepath.Join(dir, "README.md"), []byte("# site\nreadme body here\n"), 0o644)
	os.WriteFile(filepath.Join(dir, "docs", "guide.txt"), []byte("guide line one\n"), 0o644)
	os.WriteFile(filepath.Join(dir, "logo.svg"), []byte("<svg xmlns=\"http://www.w3.org/2000/svg\"/>\n"), 0o644)
	mustGit(t, dir, "add", ".")
	mustGit(t, dir, "commit", "-m", "add docs")
	mustGit(t, dir, "push", withToken(t, ts.URL+"/site.git"), "master")

	for _, tc := range []struct{ path, want string }{
		{"/", "site"},
		{"/site", "readme body here"},
		{"/site/tree/master/docs", "guide.txt"},
		{"/site/blob/master/docs/guide.txt", "guide line one"},
		{"/site/raw/master/docs/guide.txt", "guide line one"},
		{"/site/commits", "add docs"},
		{"/site/refs", "master"},
	} {
		code, body := get(t, ts.URL+tc.path)
		if code != http.StatusOK {
			t.Errorf("GET %s = %d", tc.path, code)
			continue
		}
		if !strings.Contains(body, tc.want) {
			t.Errorf("GET %s: missing %q", tc.path, tc.want)
		}
	}

	// Commit page renders the diff.
	commits, err := store.log(t.Context(), "site", "master", 10)
	if err != nil || len(commits) == 0 {
		t.Fatalf("log: %v", err)
	}
	code, body := get(t, ts.URL+"/site/commit/"+commits[0].Hash)
	if code != http.StatusOK || !strings.Contains(body, "guide line one") {
		t.Errorf("commit page: code %d, diff shown: %v", code, strings.Contains(body, "guide line one"))
	}

	// Media files get their real content type so README embeds render.
	resp, err := http.Get(ts.URL + "/site/raw/master/logo.svg")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if ct := resp.Header.Get("Content-Type"); ct != "image/svg+xml" {
		t.Errorf("svg raw content-type = %q", ct)
	}

	// Traversal and junk stay 404.
	for _, path := range []string{"/nope", "/site/blob/master/../../etc/passwd", "/site/raw/master/%2e%2e/x"} {
		if code, _ := get(t, ts.URL+path); code != http.StatusNotFound {
			t.Errorf("GET %s = %d, want 404", path, code)
		}
	}
}

func TestReadOnlyWithoutToken(t *testing.T) {
	store := &Store{Root: t.TempDir()}
	srv := &Server{Store: store, Token: ""}
	ts := httptest.NewServer(srv.handler())
	defer ts.Close()

	work := t.TempDir()
	mustGit(t, work, "init", "r")
	dir := filepath.Join(work, "r")
	os.WriteFile(filepath.Join(dir, "x"), []byte("x"), 0o644)
	mustGit(t, dir, "add", ".")
	mustGit(t, dir, "commit", "-m", "x")

	// Even a well-formed credential is refused when no token is configured.
	u, _ := url.Parse(ts.URL + "/r.git")
	u.User = url.UserPassword("owner", "anything")
	if out, err := gitCmd(t, dir, "push", u.String(), "master"); err == nil {
		t.Fatalf("push succeeded on tokenless server:\n%s", out)
	}
}
