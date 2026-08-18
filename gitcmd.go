package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

// All repository access goes through the real git binary: frieren owns HTTP,
// auth, and rendering, while git owns object storage and the pack protocol.

var repoNameRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]*$`)

// reservedNames are path roots the web UI claims for itself.
var reservedNames = map[string]bool{"static": true}

func validRepoName(name string) bool {
	return repoNameRe.MatchString(name) && !reservedNames[name] && len(name) <= 100
}

func validRef(ref string) bool {
	if ref == "" || len(ref) > 250 || strings.HasPrefix(ref, "-") || strings.Contains(ref, "..") {
		return false
	}
	for _, r := range ref {
		if r < 0x20 || r == 0x7f || r == ' ' || r == '~' || r == '^' || r == ':' || r == '\\' {
			return false
		}
	}
	return true
}

func validPath(p string) bool {
	if p == "" {
		return true
	}
	if strings.HasPrefix(p, "/") || strings.Contains(p, "\x00") {
		return false
	}
	for _, seg := range strings.Split(p, "/") {
		if seg == "" || seg == "." || seg == ".." {
			return false
		}
	}
	return true
}

type Store struct {
	Root string
}

func (s *Store) repoPath(name string) string {
	return filepath.Join(s.Root, name+".git")
}

func (s *Store) exists(name string) bool {
	if !validRepoName(name) {
		return false
	}
	fi, err := os.Stat(filepath.Join(s.repoPath(name), "HEAD"))
	return err == nil && fi.Mode().IsRegular()
}

func (s *Store) create(name, description string) error {
	if !validRepoName(name) {
		return fmt.Errorf("invalid repository name %q", name)
	}
	if s.exists(name) {
		return fmt.Errorf("repository %q already exists", name)
	}
	if _, err := runGit(context.Background(), s.Root, nil, "init", "--bare", "-b", "master", "--quiet", name+".git"); err != nil {
		return err
	}
	if description != "" {
		return os.WriteFile(filepath.Join(s.repoPath(name), "description"), []byte(description+"\n"), 0o644)
	}
	return nil
}

// runGit executes git with -C dir and returns stdout. Stderr is folded into
// the error so callers can surface git's own explanation.
func runGit(ctx context.Context, dir string, stdin []byte, args ...string) ([]byte, error) {
	full := append([]string{"-C", dir}, args...)
	cmd := exec.CommandContext(ctx, "git", full...)
	if stdin != nil {
		cmd.Stdin = bytes.NewReader(stdin)
	}
	var out, errb bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errb
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("git %s: %w: %s", strings.Join(args, " "), err, strings.TrimSpace(errb.String()))
	}
	return out.Bytes(), nil
}

type RepoInfo struct {
	Name        string
	Description string
	Default     string
	LastCommit  time.Time
	Empty       bool
}

func (s *Store) open(name string) (*RepoInfo, error) {
	if !s.exists(name) {
		return nil, fmt.Errorf("no such repository %q", name)
	}
	info := &RepoInfo{Name: name, Default: "master"}
	dir := s.repoPath(name)
	if b, err := os.ReadFile(filepath.Join(dir, "description")); err == nil {
		d := strings.TrimSpace(string(b))
		if !strings.HasPrefix(d, "Unnamed repository") {
			info.Description = d
		}
	}
	if b, err := runGit(context.Background(), dir, nil, "symbolic-ref", "--short", "HEAD"); err == nil {
		info.Default = strings.TrimSpace(string(b))
	}
	b, err := runGit(context.Background(), dir, nil,
		"for-each-ref", "--sort=-committerdate", "--count=1", "--format=%(committerdate:unix)", "refs/heads")
	if err != nil || len(bytes.TrimSpace(b)) == 0 {
		info.Empty = true
		return info, nil
	}
	if unix, err := strconv.ParseInt(strings.TrimSpace(string(b)), 10, 64); err == nil {
		info.LastCommit = time.Unix(unix, 0)
	}
	return info, nil
}

func (s *Store) list() []*RepoInfo {
	entries, err := os.ReadDir(s.Root)
	if err != nil {
		return nil
	}
	var repos []*RepoInfo
	for _, e := range entries {
		if !e.IsDir() || !strings.HasSuffix(e.Name(), ".git") {
			continue
		}
		name := strings.TrimSuffix(e.Name(), ".git")
		if info, err := s.open(name); err == nil {
			repos = append(repos, info)
		}
	}
	sort.Slice(repos, func(i, j int) bool { return repos[i].LastCommit.After(repos[j].LastCommit) })
	return repos
}

type TreeEntry struct {
	Mode string
	Type string // blob, tree, commit (submodule)
	Hash string
	Size int64 // -1 for trees
	Name string
}

func (s *Store) lsTree(ctx context.Context, repo, ref, path string) ([]TreeEntry, error) {
	spec := ref
	if path != "" {
		spec += ":" + path
	}
	out, err := runGit(ctx, s.repoPath(repo), nil, "ls-tree", "-z", "-l", spec)
	if err != nil {
		return nil, err
	}
	var entries []TreeEntry
	for _, rec := range bytes.Split(out, []byte{0}) {
		if len(rec) == 0 {
			continue
		}
		meta, name, ok := bytes.Cut(rec, []byte{'\t'})
		if !ok {
			continue
		}
		f := strings.Fields(string(meta))
		if len(f) != 4 {
			continue
		}
		size := int64(-1)
		if f[3] != "-" {
			size, _ = strconv.ParseInt(f[3], 10, 64)
		}
		entries = append(entries, TreeEntry{Mode: f[0], Type: f[1], Hash: f[2], Size: size, Name: string(name)})
	}
	sort.Slice(entries, func(i, j int) bool {
		if (entries[i].Type == "tree") != (entries[j].Type == "tree") {
			return entries[i].Type == "tree"
		}
		return entries[i].Name < entries[j].Name
	})
	return entries, nil
}

const maxBlobBytes = 2 << 20 // 2 MiB shown in the web UI; raw endpoint streams everything

func (s *Store) catBlob(ctx context.Context, repo, ref, path string) ([]byte, error) {
	return runGit(ctx, s.repoPath(repo), nil, "cat-file", "blob", ref+":"+path)
}

type Commit struct {
	Hash    string
	Short   string
	Author  string
	When    time.Time
	Subject string
}

const logFormat = "%H%x1f%h%x1f%an%x1f%at%x1f%s%x1e"

func parseCommits(out []byte) []Commit {
	var commits []Commit
	for _, rec := range bytes.Split(out, []byte{0x1e}) {
		rec = bytes.TrimSpace(rec)
		if len(rec) == 0 {
			continue
		}
		f := strings.Split(string(rec), "\x1f")
		if len(f) != 5 {
			continue
		}
		unix, _ := strconv.ParseInt(f[3], 10, 64)
		commits = append(commits, Commit{Hash: f[0], Short: f[1], Author: f[2], When: time.Unix(unix, 0), Subject: f[4]})
	}
	return commits
}

func (s *Store) log(ctx context.Context, repo, ref string, limit int) ([]Commit, error) {
	out, err := runGit(ctx, s.repoPath(repo), nil,
		"log", "--format="+logFormat, "-n", strconv.Itoa(limit), ref, "--")
	if err != nil {
		return nil, err
	}
	return parseCommits(out), nil
}

func (s *Store) commit(ctx context.Context, repo, hash string) (*Commit, error) {
	out, err := runGit(ctx, s.repoPath(repo), nil, "show", "-s", "--format="+logFormat, hash, "--")
	if err != nil {
		return nil, err
	}
	commits := parseCommits(out)
	if len(commits) == 0 {
		return nil, fmt.Errorf("no such commit %q", hash)
	}
	return &commits[0], nil
}

const maxDiffBytes = 1 << 20 // 1 MiB of rendered patch per commit page

func (s *Store) patch(ctx context.Context, repo, hash string) (string, bool, error) {
	out, err := runGit(ctx, s.repoPath(repo), nil,
		"show", "--format=", "--stat", "--patch", "--no-color", hash, "--")
	if err != nil {
		return "", false, err
	}
	if len(out) > maxDiffBytes {
		return string(out[:maxDiffBytes]), true, nil
	}
	return string(out), false, nil
}

type Ref struct {
	Name    string
	Short   string
	When    time.Time
	Subject string
}

func (s *Store) refs(ctx context.Context, repo, kind string) ([]Ref, error) {
	out, err := runGit(ctx, s.repoPath(repo), nil,
		"for-each-ref", "--sort=-creatordate",
		"--format=%(refname:short)%1f%(objectname:short)%1f%(creatordate:unix)%1f%(subject)%1e", "refs/"+kind)
	if err != nil {
		return nil, err
	}
	var refs []Ref
	for _, rec := range bytes.Split(out, []byte{0x1e}) {
		rec = bytes.TrimSpace(rec)
		if len(rec) == 0 {
			continue
		}
		f := strings.Split(string(rec), "\x1f")
		if len(f) != 4 {
			continue
		}
		unix, _ := strconv.ParseInt(f[2], 10, 64)
		refs = append(refs, Ref{Name: f[0], Short: f[1], When: time.Unix(unix, 0), Subject: f[3]})
	}
	return refs, nil
}

// readme returns the first README-ish blob at the root of ref, if any.
func (s *Store) readme(ctx context.Context, repo, ref string) (name string, body []byte) {
	entries, err := s.lsTree(ctx, repo, ref, "")
	if err != nil {
		return "", nil
	}
	for _, e := range entries {
		if e.Type != "blob" {
			continue
		}
		switch strings.ToLower(e.Name) {
		case "readme.md", "readme", "readme.txt":
			if b, err := s.catBlob(ctx, repo, ref, e.Name); err == nil && len(b) <= maxBlobBytes {
				return e.Name, b
			}
		}
	}
	return "", nil
}
