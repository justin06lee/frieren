// Parses the `git show --stat --patch` text the backend returns into a
// structure the diff view can render with per-side line numbers.

export type DiffLine = {
  kind: "add" | "del" | "ctx" | "hunk";
  old: number | null;
  new: number | null;
  text: string;
};

export type DiffFile = {
  path: string;
  adds: number;
  dels: number;
  binary: boolean;
  lines: DiffLine[];
};

export type ParsedPatch = { stat: string; files: DiffFile[] };

export function parsePatch(patch: string): ParsedPatch {
  const idx = patch.indexOf("diff --git ");
  const stat = (idx === -1 ? patch : patch.slice(0, idx)).trim();
  const body = idx === -1 ? "" : patch.slice(idx);

  const files: DiffFile[] = [];
  let file: DiffFile | null = null;
  let oldN = 0;
  let newN = 0;

  // The patch ends with a newline, so splitting leaves one empty element.
  // Drop just that one: an empty *context* line is " ", not "", so anything
  // else that is empty is still meaningful.
  const lines = body.split("\n");
  if (lines.at(-1) === "") lines.pop();

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      // `diff --git a/path b/path` — take the b/ side.
      const m = line.match(/ b\/(.*)$/);
      file = { path: m ? m[1] : line, adds: 0, dels: 0, binary: false, lines: [] };
      files.push(file);
      continue;
    }
    if (!file) continue;
    if (line.startsWith("Binary files ")) {
      file.binary = true;
      continue;
    }
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      oldN = parseInt(hunk[1], 10);
      newN = parseInt(hunk[2], 10);
      file.lines.push({ kind: "hunk", old: null, new: null, text: line });
      continue;
    }
    if (
      line.startsWith("index ") || line.startsWith("--- ") || line.startsWith("+++ ") ||
      line.startsWith("new file") || line.startsWith("deleted file") ||
      line.startsWith("old mode") || line.startsWith("new mode") ||
      line.startsWith("similarity") || line.startsWith("rename ") ||
      line.startsWith("\\ No newline")
    ) {
      continue;
    }
    if (line.startsWith("+")) {
      file.adds++;
      file.lines.push({ kind: "add", old: null, new: newN++, text: line.slice(1) });
    } else if (line.startsWith("-")) {
      file.dels++;
      file.lines.push({ kind: "del", old: oldN++, new: null, text: line.slice(1) });
    } else {
      file.lines.push({ kind: "ctx", old: oldN++, new: newN++, text: line.slice(1) });
    }
  }
  return { stat, files };
}
