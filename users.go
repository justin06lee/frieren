package main

import (
	"crypto/hmac"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// frieren has exactly two seats and no signup. One belongs to the archive's
// owner; the second sits unconfigured until the owner claims it. Guests read
// public repositories; anyone holding a seat reads everything.

const seatCount = 2

const (
	pbkdfKeyLen = 32
	saltLen     = 16
	sessionTTL  = 30 * 24 * time.Hour
)

// pbkdfIter is a var only so the test suite can turn the cost down; nothing
// at runtime changes it.
var pbkdfIter = 600_000 // OWASP guidance for PBKDF2-HMAC-SHA256

var (
	errNoSuchUser  = errors.New("no such user")
	errBadPassword = errors.New("incorrect password")
	errSeatTaken   = errors.New("seat already configured")
	errNameTaken   = errors.New("username already in use")
	errShortPass   = errors.New("password must be at least 8 characters")
	errBadUsername = errors.New("username must be 1-39 characters of letters, digits or dashes")
)

type User struct {
	Username  string    `json:"username"`
	Name      string    `json:"name"`
	Owner     bool      `json:"owner"`
	Salt      string    `json:"salt,omitempty"`
	Hash      string    `json:"hash,omitempty"`
	Iter      int       `json:"iter,omitempty"`
	CreatedAt time.Time `json:"createdAt,omitempty"`
	ChangedAt time.Time `json:"passwordChangedAt,omitempty"`
}

func (u *User) configured() bool {
	return u != nil && u.Username != "" && u.Hash != ""
}

// UserView is the shape handed to clients — never the salt or the hash.
type UserView struct {
	Seat       int       `json:"seat"`
	Username   string    `json:"username"`
	Name       string    `json:"name"`
	Owner      bool      `json:"owner"`
	Configured bool      `json:"configured"`
	ChangedAt  time.Time `json:"passwordChangedAt,omitempty"`
}

func (u *User) view(seat int) UserView {
	return UserView{
		Seat:       seat,
		Username:   u.Username,
		Name:       u.Name,
		Owner:      u.Owner,
		Configured: u.configured(),
		ChangedAt:  u.ChangedAt,
	}
}

type usersFile struct {
	Secret string  `json:"secret"`
	Users  []*User `json:"users"`
}

type Users struct {
	path string
	mu   sync.RWMutex
	data usersFile
}

func validUsername(s string) bool {
	if s == "" || len(s) > 39 {
		return false
	}
	for i, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
		case r == '-' && i > 0:
		default:
			return false
		}
	}
	return true
}

// LoadUsers opens the seat file, creating it with the bootstrap owner the
// first time the server runs.
func LoadUsers(path string) (*Users, error) {
	u := &Users{path: path}
	b, err := os.ReadFile(path)
	switch {
	case err == nil:
		if err := json.Unmarshal(b, &u.data); err != nil {
			return nil, fmt.Errorf("parse %s: %w", path, err)
		}
	case os.IsNotExist(err):
		if err := u.bootstrap(); err != nil {
			return nil, err
		}
	default:
		return nil, err
	}
	// Keep the seat count fixed even if the file was hand-edited.
	for len(u.data.Users) < seatCount {
		u.data.Users = append(u.data.Users, &User{})
	}
	u.data.Users = u.data.Users[:seatCount]
	if u.data.Secret == "" {
		u.data.Secret = randomHex(32)
		if err := u.save(); err != nil {
			return nil, err
		}
	}
	return u, nil
}

func (s *Users) bootstrap() error {
	owner := envOr("FRIEREN_OWNER", "justin06lee")
	pass := envOr("FRIEREN_PASSWORD", "i love my wife")
	first := &User{Username: owner, Name: owner, Owner: true, CreatedAt: time.Now()}
	if err := setPassword(first, pass); err != nil {
		return err
	}
	s.data = usersFile{Secret: randomHex(32), Users: []*User{first, {}}}
	if err := os.MkdirAll(filepath.Dir(s.path), 0o700); err != nil {
		return err
	}
	return s.save()
}

func randomHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic("frieren: no entropy available: " + err.Error())
	}
	return hex.EncodeToString(b)
}

// save writes the seat file atomically with owner-only permissions.
func (s *Users) save() error {
	b, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	b = append(b, '\n')
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func setPassword(u *User, password string) error {
	if len(password) < 8 {
		return errShortPass
	}
	salt := make([]byte, saltLen)
	if _, err := rand.Read(salt); err != nil {
		return err
	}
	key, err := pbkdf2.Key(sha256.New, password, salt, pbkdfIter, pbkdfKeyLen)
	if err != nil {
		return err
	}
	u.Salt = hex.EncodeToString(salt)
	u.Hash = hex.EncodeToString(key)
	u.Iter = pbkdfIter
	u.ChangedAt = time.Now()
	return nil
}

// matches recomputes the derived key and compares it in constant time.
func (u *User) matches(password string) bool {
	if !u.configured() {
		return false
	}
	salt, err := hex.DecodeString(u.Salt)
	if err != nil {
		return false
	}
	want, err := hex.DecodeString(u.Hash)
	if err != nil {
		return false
	}
	iter := u.Iter
	if iter <= 0 {
		iter = pbkdfIter
	}
	got, err := pbkdf2.Key(sha256.New, password, salt, iter, len(want))
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare(want, got) == 1
}

func (s *Users) find(username string) (*User, int) {
	for i, u := range s.data.Users {
		if u.Username != "" && strings.EqualFold(u.Username, username) {
			return u, i
		}
	}
	return nil, -1
}

// Lookup returns the seat holding username, or nil.
func (s *Users) Lookup(username string) *User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, _ := s.find(username)
	return u
}

// Authenticate checks a username/password pair. It always pays the full
// derivation cost so a missing user is not distinguishable by timing.
func (s *Users) Authenticate(username, password string) (*User, error) {
	s.mu.RLock()
	u, _ := s.find(username)
	s.mu.RUnlock()
	if u == nil {
		decoy := &User{Salt: strings.Repeat("00", saltLen), Hash: strings.Repeat("00", pbkdfKeyLen), Iter: pbkdfIter, Username: "-"}
		decoy.matches(password)
		return nil, errNoSuchUser
	}
	if !u.matches(password) {
		return nil, errBadPassword
	}
	return u, nil
}

// Owner returns the seat flagged as the archive's owner, if it is configured.
func (s *Users) Owner() *User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, u := range s.data.Users {
		if u.Owner && u.configured() {
			return u
		}
	}
	return nil
}

// Seats lists both seats for the settings screen.
func (s *Users) Seats() []UserView {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]UserView, 0, len(s.data.Users))
	for i, u := range s.data.Users {
		out = append(out, u.view(i+1))
	}
	return out
}

// ChangePassword verifies the current password before replacing it.
func (s *Users) ChangePassword(username, current, next string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, _ := s.find(username)
	if u == nil {
		return errNoSuchUser
	}
	if !u.matches(current) {
		return errBadPassword
	}
	if err := setPassword(u, next); err != nil {
		return err
	}
	return s.save()
}

// SetPassword replaces a password without knowing the old one — the CLI
// escape hatch for a locked-out owner.
func (s *Users) SetPassword(username, next string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, _ := s.find(username)
	if u == nil {
		return errNoSuchUser
	}
	if err := setPassword(u, next); err != nil {
		return err
	}
	return s.save()
}

// ClaimSeat configures the spare seat. There is no third seat to claim.
func (s *Users) ClaimSeat(username, name, password string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !validUsername(username) {
		return errBadUsername
	}
	if u, _ := s.find(username); u != nil {
		return errNameTaken
	}
	for _, u := range s.data.Users {
		if u.configured() {
			continue
		}
		if u.Username != "" {
			return errSeatTaken
		}
		fresh := &User{Username: username, Name: name, CreatedAt: time.Now()}
		if fresh.Name == "" {
			fresh.Name = username
		}
		if err := setPassword(fresh, password); err != nil {
			return err
		}
		*u = *fresh
		return s.save()
	}
	return errSeatTaken
}

// ReleaseSeat empties the spare seat again. The owner's seat cannot be released.
func (s *Users) ReleaseSeat(username string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, _ := s.find(username)
	if u == nil {
		return errNoSuchUser
	}
	if u.Owner {
		return errors.New("the owner's seat cannot be released")
	}
	*u = User{}
	return s.save()
}

// ——— sessions ———
//
// Sessions are stateless: a signed username + expiry + password fingerprint.
// Nothing is stored server-side, so restarts don't sign anyone out, and
// changing a password invalidates every session that password issued.

func (s *Users) fingerprint(u *User) string {
	sum := sha256.Sum256([]byte(u.Hash))
	return hex.EncodeToString(sum[:4])
}

func (s *Users) sign(payload string) string {
	mac := hmac.New(sha256.New, []byte(s.data.Secret))
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// Issue mints a session token for a user who has just proven their password.
func (s *Users) Issue(u *User) string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	payload := fmt.Sprintf("%s|%d|%s", u.Username, time.Now().Add(sessionTTL).Unix(), s.fingerprint(u))
	enc := base64.RawURLEncoding.EncodeToString([]byte(payload))
	return "v1." + enc + "." + s.sign(payload)
}

// Verify returns the user a session token belongs to, or nil if the token is
// forged, expired, or was issued under a password that has since changed.
func (s *Users) Verify(token string) *User {
	parts := strings.Split(token, ".")
	if len(parts) != 3 || parts[0] != "v1" {
		return nil
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil
	}
	payload := string(raw)

	s.mu.RLock()
	defer s.mu.RUnlock()
	if subtle.ConstantTimeCompare([]byte(s.sign(payload)), []byte(parts[2])) != 1 {
		return nil
	}
	fields := strings.Split(payload, "|")
	if len(fields) != 3 {
		return nil
	}
	exp, err := strconv.ParseInt(fields[1], 10, 64)
	if err != nil || time.Now().After(time.Unix(exp, 0)) {
		return nil
	}
	u, _ := s.find(fields[0])
	if u == nil || !u.configured() || s.fingerprint(u) != fields[2] {
		return nil
	}
	return u
}
