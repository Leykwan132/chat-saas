import { splitStreamingAiReplyMessages } from "../../convex/chat/aiReplyMessages";

type PlaygroundMessagePart = {
  type: string;
  text?: string;
};

export function playgroundAssistantTextParts(message: {
  text?: string;
  parts?: PlaygroundMessagePart[];
}): string[] {
  const streamedText = (message.parts ?? [])
    .filter(
      (part): part is PlaygroundMessagePart & { text: string } =>
        part.type === "text" && Boolean(part.text?.trim()),
    )
    .map((part) => part.text)
    .join("");

  if (streamedText) return splitStreamingAiReplyMessages(streamedText);
  return splitStreamingAiReplyMessages(message.text ?? "");
}
