import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  em: ({ children }) => <strong>{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

export function WidgetMessageContent({
  content,
  isAssistantMessage,
}: {
  content: string;
  isAssistantMessage: boolean;
}) {
  if (!isAssistantMessage) return <span>{content}</span>;

  return (
    <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </Markdown>
  );
}
