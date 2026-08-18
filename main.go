package main

import (
	"crypto/rand"
	"encoding/hex"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

var version = "dev"

const usage = `frieren — a single-binary, self-hosted git server.
Anyone can browse and clone; only the holder of the token can push.

Usage:
  frieren serve [-addr :7420] [-root DIR] [-token TOKEN]
  frieren init <name> [description]     create an empty repository under the root
  frieren token                         generate a random owner token
  frieren version

Environment:
  FRIEREN_ADDR    listen address        (default :7420)
  FRIEREN_ROOT    repository directory  (default ./repos)
  FRIEREN_TOKEN   owner token; unset = server is read-only for everyone
`

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	log.SetFlags(log.LstdFlags)
	if len(os.Args) < 2 {
		fmt.Fprint(os.Stderr, usage)
		os.Exit(2)
	}
	switch os.Args[1] {
	case "serve":
		serve(os.Args[2:])
	case "init":
		initRepo(os.Args[2:])
	case "token":
		buf := make([]byte, 32)
		rand.Read(buf)
		fmt.Println(hex.EncodeToString(buf))
	case "version":
		fmt.Println("frieren", version)
	default:
		fmt.Fprint(os.Stderr, usage)
		os.Exit(2)
	}
}

func serve(args []string) {
	fs := flag.NewFlagSet("serve", flag.ExitOnError)
	addr := fs.String("addr", envOr("FRIEREN_ADDR", ":7420"), "listen address")
	root := fs.String("root", envOr("FRIEREN_ROOT", "./repos"), "repository directory")
	token := fs.String("token", os.Getenv("FRIEREN_TOKEN"), "owner token (push access)")
	fs.Parse(args)

	absRoot, err := filepath.Abs(*root)
	if err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll(absRoot, 0o755); err != nil {
		log.Fatal(err)
	}

	srv := &Server{Store: &Store{Root: absRoot}, Token: *token}
	if srv.Token == "" {
		log.Print("WARNING: no token configured (FRIEREN_TOKEN) — pushing is disabled, serving read-only")
	}
	log.Printf("frieren %s serving %s on %s", version, absRoot, *addr)
	log.Fatal(http.ListenAndServe(*addr, srv.handler()))
}

func initRepo(args []string) {
	fs := flag.NewFlagSet("init", flag.ExitOnError)
	root := fs.String("root", envOr("FRIEREN_ROOT", "./repos"), "repository directory")
	fs.Parse(args)
	if fs.NArg() < 1 {
		fmt.Fprint(os.Stderr, usage)
		os.Exit(2)
	}
	name, desc := fs.Arg(0), fs.Arg(1)
	if err := os.MkdirAll(*root, 0o755); err != nil {
		log.Fatal(err)
	}
	store := &Store{Root: *root}
	if err := store.create(name, desc); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("created %s\n", store.repoPath(name))
}
