package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func getJSON(t *testing.T, url string, v any) int {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(v); err != nil {
		t.Fatalf("GET %s: bad json: %v", url, err)
	}
	return resp.StatusCode
}

func TestJSONAPI(t *testing.T) {
	ts, store := newTestServer(t)
	if err := store.create("apidemo", "api smoke test"); err != nil {
		t.Fatal(err)
	}

	work := t.TempDir()
	mustGit(t, work, "clone", ts.URL+"/apidemo.git", "w")
	dir := filepath.Join(work, "w")
	os.WriteFile(filepath.Join(dir, "README.md"), []byte("# apidemo\nhello api\n"), 0o644)
	os.MkdirAll(filepath.Join(dir, "src"), 0o755)
	os.WriteFile(filepath.Join(dir, "src", "main.go"), []byte("package main\n"), 0o644)
	mustGit(t, dir, "add", ".")
	mustGit(t, dir, "commit", "-m", "seed api test")
	mustGit(t, dir, "push", withToken(t, ts.URL+"/apidemo.git"), "master")

	var repos []RepoInfo
	if code := getJSON(t, ts.URL+"/api/repos", &repos); code != 200 || len(repos) != 1 || repos[0].Name != "apidemo" {
		t.Fatalf("repos: code %d, %+v", code, repos)
	}
	if repos[0].Empty || repos[0].Description != "api smoke test" {
		t.Errorf("repo info wrong: %+v", repos[0])
	}

	var entries []TreeEntry
	if code := getJSON(t, ts.URL+"/api/repos/apidemo/tree?path=src", &entries); code != 200 || len(entries) != 1 || entries[0].Name != "main.go" {
		t.Fatalf("tree: code %d, %+v", code, entries)
	}

	var blob blobResponse
	if code := getJSON(t, ts.URL+"/api/repos/apidemo/blob?path=src/main.go", &blob); code != 200 || blob.Content != "package main\n" {
		t.Fatalf("blob: code %d, %+v", code, blob)
	}

	var readme readmeResponse
	if code := getJSON(t, ts.URL+"/api/repos/apidemo/readme", &readme); code != 200 || !strings.Contains(readme.Content, "hello api") {
		t.Fatalf("readme: code %d, %+v", code, readme)
	}

	var commits []Commit
	if code := getJSON(t, ts.URL+"/api/repos/apidemo/commits", &commits); code != 200 || len(commits) != 1 || commits[0].Subject != "seed api test" {
		t.Fatalf("commits: code %d, %+v", code, commits)
	}

	var full commitResponse
	if code := getJSON(t, ts.URL+"/api/repos/apidemo/commit/"+commits[0].Hash, &full); code != 200 || !strings.Contains(full.Patch, "package main") {
		t.Fatalf("commit: code %d", code)
	}

	var refs map[string][]Ref
	if code := getJSON(t, ts.URL+"/api/repos/apidemo/refs", &refs); code != 200 || len(refs["branches"]) != 1 {
		t.Fatalf("refs: code %d, %+v", code, refs)
	}

	// Errors are JSON with proper codes.
	var e map[string]string
	if code := getJSON(t, ts.URL+"/api/repos/ghost", &e); code != 404 || e["error"] == "" {
		t.Errorf("missing repo: code %d, %+v", code, e)
	}
	if code := getJSON(t, ts.URL+"/api/repos/apidemo/blob?path=../secret", &e); code != 400 {
		t.Errorf("traversal blob: code %d", code)
	}
}
