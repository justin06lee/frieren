import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { rawUrl } from "@/lib/api";

// READMEs often embed HTML (centered headers, <img>, <br>). Render it, but
// sanitized — repository content must never script against the site.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "align", "width", "height"],
  },
};

// Renders a repository README. Relative image/link targets are rewritten to
// the backend's raw endpoint so screenshots in READMEs just work.
export default function Markdown({
  repo,
  refName,
  source,
}: {
  repo: string;
  refName: string;
  source: string;
}) {
  const transform = (url: string) => {
    if (/^(https?:|mailto:|#|data:)/i.test(url)) return defaultUrlTransform(url);
    return rawUrl(repo, refName, url.replace(/^\.\//, ""));
  };
  return (
    <div className="prose-frost">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
        urlTransform={transform}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
