import { createHighlighter, type Highlighter } from "shiki";

const LANGS = [
  "typescript", "tsx", "javascript", "jsx", "json", "go", "rust", "python",
  "c", "cpp", "css", "html", "yaml", "toml", "markdown", "bash", "sql",
  "java", "swift", "kotlin", "ruby", "php", "docker", "make", "diff",
];

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript", mts: "typescript", cts: "typescript", tsx: "tsx",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx",
  json: "json", go: "go", rs: "rust", py: "python",
  c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp",
  css: "css", html: "html", htm: "html",
  yml: "yaml", yaml: "yaml", toml: "toml", md: "markdown",
  sh: "bash", bash: "bash", zsh: "bash", sql: "sql",
  java: "java", swift: "swift", kt: "kotlin", rb: "ruby", php: "php",
  dockerfile: "docker", patch: "diff", diff: "diff",
};

let highlighter: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighter ??= createHighlighter({ themes: ["github-dark"], langs: LANGS });
  return highlighter;
}

export function langForFile(name: string): string | null {
  const base = name.toLowerCase().split("/").pop() ?? "";
  if (base === "makefile") return "make";
  if (base === "dockerfile") return "docker";
  const ext = base.includes(".") ? base.split(".").pop()! : "";
  return EXT_TO_LANG[ext] ?? null;
}

// highlight returns shiki HTML for known languages, null otherwise
// (the caller renders a plain <pre> instead).
export async function highlight(code: string, lang: string | null): Promise<string | null> {
  if (!lang) return null;
  try {
    const hl = await getHighlighter();
    return hl.codeToHtml(code, { lang, theme: "github-dark" });
  } catch {
    return null;
  }
}
