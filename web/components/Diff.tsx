import { parsePatch } from "@/lib/diff";
import { FileIcon } from "./icons";
import CopyButton from "./CopyButton";
import { panel } from "./ui";

const rowClass = {
  add: "bg-add-bg",
  del: "bg-del-bg",
  ctx: "",
  hunk: "bg-link/10 text-link",
} as const;

const gutterClass = {
  add: "bg-add-gutter text-ink/70",
  del: "bg-del-gutter text-ink/70",
  ctx: "text-faint",
  hunk: "text-link/70",
} as const;

export default function Diff({ patch }: { patch: string }) {
  const { stat, files } = parsePatch(patch);

  if (files.length === 0) {
    return (
      <p className={`${panel} px-4 py-8 text-center text-sm text-mute`}>
        This commit doesn&apos;t touch any files.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {stat && (
        <div className={`${panel} overflow-hidden`}>
          <div className="border-b border-hair px-4 py-2 text-sm font-semibold">
            {files.length} changed {files.length === 1 ? "file" : "files"}
          </div>
          <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-mute">
            {stat}
          </pre>
        </div>
      )}

      {files.map((file) => (
        <section key={file.path} className={`${panel} overflow-hidden`}>
          <header className="flex items-center gap-2 border-b border-hair bg-raised px-4 py-2">
            <FileIcon className="h-4 w-4 shrink-0 text-mute" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink">
              {file.path}
            </span>
            <span className="shrink-0 font-mono text-xs text-green">+{file.adds}</span>
            <span className="shrink-0 font-mono text-xs text-red">−{file.dels}</span>
            <CopyButton value={file.path} label="Copy path" className="shrink-0" />
          </header>

          {file.binary ? (
            <p className="px-4 py-6 text-center text-sm text-mute">Binary file changed.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-xs leading-5">
                <tbody>
                  {file.lines.map((line, i) => (
                    <tr key={i} className={rowClass[line.kind]}>
                      <td
                        className={`w-[1%] select-none whitespace-nowrap px-2 text-right align-top ${gutterClass[line.kind]}`}
                      >
                        {line.old ?? ""}
                      </td>
                      <td
                        className={`w-[1%] select-none whitespace-nowrap px-2 text-right align-top ${gutterClass[line.kind]}`}
                      >
                        {line.new ?? ""}
                      </td>
                      <td className="w-[1%] select-none pl-2 pr-1 align-top text-faint">
                        {line.kind === "add" ? "+" : line.kind === "del" ? "−" : ""}
                      </td>
                      <td className="whitespace-pre pr-4 align-top">
                        {line.kind === "hunk" ? line.text : line.text || " "}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
