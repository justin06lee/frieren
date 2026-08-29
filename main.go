package main

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

var version = "dev"

const usage = `frieren — a single-binary, self-hosted git server.
Guests browse and clone public repositories; seat holders see everything.

Usage:
  frieren serve [-addr :7420] [-root DIR] [-token TOKEN]
  frieren init <name> [description] [-private]   create an empty repository
  frieren token                                  generate a random owner token
  frieren users                                  list the two seats
  frieren passwd <username>                      set a seat's password
  frieren version

Environment:
  FRIEREN_ADDR      listen address        (default :7420)
  FRIEREN_ROOT      repository directory  (default ./repos)
  FRIEREN_TOKEN     owner token for pushing over HTTP basic auth
  FRIEREN_OWNER     owner username, first run only   (default justin06lee)
  FRIEREN_PASSWORD  owner password, first run only
`

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// statePath is where the seat file lives — inside the repository root, so the
// systemd unit's single ReadWritePaths entry already covers it.
func statePath(root string) string {
	return filepath.Join(root, ".frieren", "users.json")
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
	case "users":
		listUsers(os.Args[2:])
	case "passwd":
		setUserPassword(os.Args[2:])
	case "version":
		fmt.Println("frieren", version)
	default:
		fmt.Fprint(os.Stderr, usage)
		os.Exit(2)
	}
}

// rootFlags starts a flag set carrying the shared -root flag.
func rootFlags(name string) (*flag.FlagSet, *string) {
	fs := flag.NewFlagSet(name, flag.ExitOnError)
	root := fs.String("root", envOr("FRIEREN_ROOT", "./repos"), "repository directory")
	return fs, root
}

func serve(args []string) {
	fs, root := rootFlags("serve")
	addr := fs.String("addr", envOr("FRIEREN_ADDR", ":7420"), "listen address")
	token := fs.String("token", os.Getenv("FRIEREN_TOKEN"), "owner token (push access)")
	fs.Parse(args)

	absRoot, err := filepath.Abs(*root)
	if err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll(absRoot, 0o755); err != nil {
		log.Fatal(err)
	}

	users, err := LoadUsers(statePath(absRoot))
	if err != nil {
		log.Fatal(err)
	}

	srv := &Server{
		Store:    &Store{Root: absRoot},
		Users:    users,
		Token:    *token,
		Throttle: newThrottle(),
	}
	if srv.Token == "" {
		log.Print("no FRIEREN_TOKEN set — push with your seat's username and password instead")
	}
	for _, seat := range users.Seats() {
		switch {
		case !seat.Configured:
			log.Printf("seat %d: unconfigured", seat.Seat)
		case seat.Owner:
			log.Printf("seat %d: %s (owner)", seat.Seat, seat.Username)
		default:
			log.Printf("seat %d: %s", seat.Seat, seat.Username)
		}
	}
	log.Printf("frieren %s serving %s on %s", version, absRoot, *addr)

	// Timeouts matter more now that the server accepts passwords: an
	// unbounded read is a free way to pin a connection open.
	httpSrv := &http.Server{
		Addr:              *addr,
		Handler:           srv.handler(),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       2 * time.Minute,
		MaxHeaderBytes:    1 << 20,
	}
	log.Fatal(httpSrv.ListenAndServe())
}

func initRepo(args []string) {
	fs, root := rootFlags("init")
	private := fs.Bool("private", false, "create the repository as private")
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
	if *private {
		if err := store.setPrivate(name, true); err != nil {
			log.Fatal(err)
		}
	}
	fmt.Printf("created %s\n", store.repoPath(name))
}

func openUsers(root string) *Users {
	abs, err := filepath.Abs(root)
	if err != nil {
		log.Fatal(err)
	}
	users, err := LoadUsers(statePath(abs))
	if err != nil {
		log.Fatal(err)
	}
	return users
}

func listUsers(args []string) {
	fs, root := rootFlags("users")
	fs.Parse(args)
	for _, seat := range openUsers(*root).Seats() {
		switch {
		case !seat.Configured:
			fmt.Printf("seat %d  (unconfigured)\n", seat.Seat)
		case seat.Owner:
			fmt.Printf("seat %d  %s  owner\n", seat.Seat, seat.Username)
		default:
			fmt.Printf("seat %d  %s\n", seat.Seat, seat.Username)
		}
	}
}

// setUserPassword is the escape hatch for a locked-out owner: it replaces a
// password without needing the old one, and only works on the server's disk.
func setUserPassword(args []string) {
	fs, root := rootFlags("passwd")
	fs.Parse(args)
	if fs.NArg() < 1 {
		fmt.Fprint(os.Stderr, "usage: frieren passwd <username>\n")
		os.Exit(2)
	}
	name := fs.Arg(0)
	fmt.Fprintf(os.Stderr, "new password for %s: ", name)
	// Read a whole line — passwords are allowed to contain spaces.
	in := bufio.NewScanner(os.Stdin)
	if !in.Scan() {
		log.Fatal("could not read password")
	}
	if err := openUsers(*root).SetPassword(name, in.Text()); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("password updated for %s\n", name)
}
