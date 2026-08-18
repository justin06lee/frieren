import { parsePatch } from "@/lib/diff";

const lineStyles = {
  add: "bg-add-bg text-add",
  del: "bg-del-bg text-del",
  ctx: "text-fog",
  hunk: "bg-raise text-frost/80",
} as const;

export default function Diff({ patch }: { patch: string }) {
  const { stat, files } = parsePatch(patch);
  return (
    <div className="space-y-6">
      {stat && (
        <pre className="overflow-x-auto border border-line bg-panel px-4 py-3 font-mono text-xs leading-relaxed text-fog">
          {stat}
        </pre>
      )}
      {files.map((f) => (
        <section key={f.path} className="border border-line bg-panel">
          <header className="flex items-center gap-3 border-b border-line bg-raise px-4 py-2 font-mono text-xs">
            <span className="truncate text-snow">{f.path}</span>
            <span className="ml-auto shrink-0 text-add">+{f.adds}</span>
            <span className="shrink-0 text-del">−{f.dels}</span>
          </header>
          {f.binary ? (
            <p className="px-4 py-4 font-mono text-xs text-fog">binary file changed</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-xs leading-relaxed">
                <tbody>
                  {f.lines.map((l, i) => (
                    <tr key={i} className={lineStyles[l.kind]}>
                      <td className="w-10 select-none pr-2 text-right align-top text-dim">
                        {l.old ?? ""}
                      </td>
                      <td className="w-10 select-none pr-3 text-right align-top text-dim">
                        {l.new ?? ""}
                      </td>
                      <td className="w-4 select-none text-center align-top opacity-70">
                        {l.kind === "add" ? "+" : l.kind === "del" ? "−" : ""}
                      </td>
                      <td className="whitespace-pre pr-4 align-top">
                        {l.kind === "hunk" ? l.text : l.text || " "}
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
