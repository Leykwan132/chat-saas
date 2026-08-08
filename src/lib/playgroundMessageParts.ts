import { splitStreamingAiReplyMessages } from "../../convex/chat/aiReplyMessages";

type PlaygroundMessagePart = {
  type: string;
  text?: string;
};

export function playgroundAssistantTextParts(message: {
  text?: string;
  parts?: PlaygroundMessagePart[];
}): string[] {
  const parts = (message.parts ?? [])
    .filter(
      (part): part is PlaygroundMessagePart & { text: string } =>
        part.type === "text" && Boolean(part.text?.trim()),
    )
    .flatMap((part) => splitStreamingAiReplyMessages(part.text));

  if (parts.length > 0) return parts;
  return splitStreamingAiReplyMessages(message.text ?? "");
}
