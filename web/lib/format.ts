export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t || t <= 0) return "";
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} minutes ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  if (s < 30 * 86400) return `${Math.floor(s / 86400)} days ago`;
  return `on ${new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}`;
}

export function byteSize(n: number): string {
  if (n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1 << 20) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1 << 20)).toFixed(1)} MB`;
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Commit lists are grouped by calendar day, so both a stable key and a
// human heading are needed for the same timestamp.
export function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
