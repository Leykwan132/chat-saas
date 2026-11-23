import { useSmoothText } from "@convex-dev/agent/react";
import Markdown, { type Components } from "react-markdown";
import {
  parseCitations,
  stripInlineCitationMarkers,
  type Citation,
} from "@/lib/citation-parser";
import { citationLabel } from "@/lib/citationLabel";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
  InlineCitationQuote,
} from "@/components/ai-elements/inline-citation";

const whatsAppMarkdownComponents: Components = {
  em: ({ children, ...props }) => <strong {...props}>{children}</strong>,
};

export function StreamingMarkdown({
  text,
  status,
}: {
  text: string;
  status: string;
}) {
  const [visibleText] = useSmoothText(text, {
    startStreaming: status === "streaming",
  });
  const processed = visibleText.replace(/\n+/g, "\n\n");
  const isLoading = !text && status === "streaming";

  if (isLoading) {
    return (
      <Shimmer duration={2} spread={3}>
        Thinking…
      </Shimmer>
    );
  }

  const isComplete = status !== "streaming" && status !== "pending";
  const { content: parsedContent, citations } = isComplete
    ? parseCitations(processed)
    : {
        content: stripInlineCitationMarkers(processed),
        citations: [] as Citation[],
      };
  const hasCitations = citations.length > 0 && isComplete;

  return (
    <div className="[&_p]:leading-snug [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p:not(:last-child)]:mb-2">
      <Markdown components={whatsAppMarkdownComponents}>
        {parsedContent}
      </Markdown>
      {hasCitations ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {citations.map((citation) => (
            <InlineCitation
              key={`source-${citation.number}-${citation.url ?? citation.title}`}
            >
              <InlineCitationCard>
                <InlineCitationCardTrigger
                  label={citationLabel(citation)}
                  sources={citation.url ? [citation.url] : []}
                />
                <InlineCitationCardBody>
                  <InlineCitationCarousel>
                    <InlineCitationCarouselHeader>
                      <InlineCitationCarouselPrev />
                      <InlineCitationCarouselNext />
                      <InlineCitationCarouselIndex />
                    </InlineCitationCarouselHeader>
                    <InlineCitationCarouselContent>
                      <InlineCitationCarouselItem>
                        <InlineCitationSource
                          title={citation.title}
                          url={citation.url}
                          description={citation.description}
                        />
                        {citation.quote && (
                          <InlineCitationQuote>
                            {citation.quote}
                          </InlineCitationQuote>
                        )}
                      </InlineCitationCarouselItem>
                    </InlineCitationCarouselContent>
                  </InlineCitationCarousel>
                </InlineCitationCardBody>
              </InlineCitationCard>
            </InlineCitation>
          ))}
        </div>
      ) : null}
    </div>
  );
}
