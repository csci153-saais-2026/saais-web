import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

type Node = { type: string; value?: string; children?: Node[] };

// Models write <br> to break lines inside table cells. Turn only that tag into a
// line break; all other HTML stays unrendered.
function remarkBrTags() {
  return function visit(node: Node) {
    if (node.type === "html" && /^<br\s*\/?>$/i.test(node.value ?? "")) {
      node.type = "break";
      delete node.value;
    }
    node.children?.forEach(visit);
  };
}

// Plain-text replies pass through this unchanged: they become paragraphs, and
// remark-breaks keeps their single line breaks. Raw HTML is never rendered, and
// images are dropped so a reply cannot make the browser load a remote URL.
export function AssistantReply({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-2 wrap-break-word [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#C9C2A8] [&_blockquote]:pl-2 [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[12.5px] [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-black/5 [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_td]:border [&_td]:border-[#C9C2A8] [&_td]:px-2 [&_th]:border [&_th]:border-[#C9C2A8] [&_th]:px-2 [&_ul]:list-disc [&_ul]:pl-5">
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkBrTags]}
        disallowedElements={["img"]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="border-collapse">{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
