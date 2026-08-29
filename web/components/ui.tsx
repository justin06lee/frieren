import { LockIcon, RepoIcon } from "./icons";

// Button recipes shared by links, buttons and form submits, so a green
// "primary" looks the same wherever it appears.
export const btn =
  "inline-flex items-center justify-center gap-2 rounded-md border border-line bg-raised px-3 py-[5px] text-sm font-medium text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-brand px-3 py-[5px] text-sm font-medium text-white transition-colors hover:bg-brand-hi disabled:cursor-not-allowed disabled:opacity-60";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-md border border-red/40 bg-transparent px-3 py-[5px] text-sm font-medium text-red transition-colors hover:bg-red hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

export const input =
  "w-full rounded-md border border-line bg-inset px-3 py-[5px] text-sm text-ink placeholder:text-faint focus:border-link focus:outline-none focus:ring-1 focus:ring-link";

export const panel = "rounded-md border border-hair bg-panel";

// Avatars are identicons derived from the name: a 5×5 grid mirrored down the
// middle, the way GitHub's default avatars work. Deterministic, renderable on
// the server, and nothing to host.
const AVATAR_COLORS = [
  "#4493f8", "#a371f7", "#3fb950", "#d29922", "#f0883e", "#39c5cf", "#f85149",
];

function hash32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function Avatar({ name, size = 20 }: { name: string; size?: number }) {
  const h = hash32(name.trim().toLowerCase() || "?");
  const color = AVATAR_COLORS[h % AVATAR_COLORS.length];

  // Only the left three columns are decided; 3 and 4 mirror 1 and 0.
  const cells: [number, number][] = [];
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 5; row++) {
      if (!((h >> (col * 5 + row)) & 1)) continue;
      cells.push([col, row]);
      if (col < 2) cells.push([4 - col, row]);
    }
  }
  // A hash of all zeroes would draw nothing; give it a spine instead.
  if (cells.length === 0) for (let row = 0; row < 5; row++) cells.push([2, row]);

  return (
    <svg
      viewBox="0 0 7 7"
      width={size}
      height={size}
      aria-hidden="true"
      className="shrink-0 rounded-full bg-raised"
    >
      {cells.map(([col, row]) => (
        <rect key={`${col}-${row}`} x={col + 1} y={row + 1} width="1" height="1" fill={color} />
      ))}
    </svg>
  );
}

export function VisibilityBadge({ isPrivate }: { isPrivate: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-[1px] text-xs font-medium text-mute">
      {isPrivate ? <LockIcon className="h-3 w-3" /> : <RepoIcon className="h-3 w-3" />}
      {isPrivate ? "Private" : "Public"}
    </span>
  );
}

export function Counter({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-raised px-2 py-[1px] text-xs font-medium text-mute">
      {children}
    </span>
  );
}

// A one-line notice used by forms for both outcomes.
export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  const isError = Boolean(error);
  return (
    <p
      role="status"
      className={`rounded-md border px-3 py-2 text-sm ${
        isError ? "border-red/40 bg-red/10 text-red" : "border-green/40 bg-green/10 text-green"
      }`}
    >
      {error ?? ok}
    </p>
  );
}
