import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { rawUrl } from "@/lib/env";
import { BookIcon } from "./icons";
import { panel } from "./ui";

// READMEs routinely embed raw HTML — centred headers, <img>, <br>. Render it,
// but sanitised: repository content must never script against the site.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "align", "width", "height"],
  },
};

export default function Readme({
  repo,
  refName,
  name,
  source,
}: {
  repo: string;
  refName: string;
  name: string;
  source: string;
}) {
  // Relative links and images point at paths inside the repository, so they
  // resolve against the backend's raw endpoint.
  const transform = (url: string) => {
    if (/^(https?:|mailto:|#|data:)/i.test(url)) return defaultUrlTransform(url);
    return rawUrl(repo, refName, url.replace(/^\.\//, ""));
  };

  return (
    <section className={`${panel} overflow-hidden`}>
      <div className="flex items-center gap-2 border-b border-hair px-4 py-2.5">
        <BookIcon className="h-4 w-4 text-mute" />
        <h2 className="text-sm font-semibold">{name}</h2>
      </div>
      <div className="markdown px-6 py-6 md:px-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
          urlTransform={transform}
        >
          {source}
        </ReactMarkdown>
      </div>
    </section>
  );
}
