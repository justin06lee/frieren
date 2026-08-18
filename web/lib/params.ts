// Next.js delivers dynamic segments percent-encoded in some cases; decode
// defensively so refs like "feat%2Fauth" become "feat/auth".
export function dec(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function decPath(segs: string[] | undefined): string {
  return (segs ?? []).map(dec).join("/");
}
