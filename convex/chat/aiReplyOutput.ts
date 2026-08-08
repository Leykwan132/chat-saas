import { z } from "zod/v3";

export const aiReplyOutputSchema = z.object({
  messages: z.array(
    z.string().trim().min(1).describe(
      "One short customer-visible chat message without workflow metadata, media URLs, or internal markers.",
    ),
  ).min(2).max(4).describe(
    "Two to four short chat messages to send to the customer in order.",
  ),
});
