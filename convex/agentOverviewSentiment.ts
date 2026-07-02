import type { Doc } from "./_generated/dataModel";
import {
  emptyCustomerSentimentCounts,
  type CustomerSentimentCounts,
} from "../shared/customerSentiment";

export function getAgentOverviewSentimentDistribution(
  conversations: Doc<"conversations">[],
): CustomerSentimentCounts {
  const counts = emptyCustomerSentimentCounts();

  for (const conversation of conversations) {
    if (conversation.customerSentiment !== undefined) {
      counts[conversation.customerSentiment] += 1;
    }
  }

  return counts;
}
