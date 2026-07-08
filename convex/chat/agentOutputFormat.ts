export function buildAgentOutputFormatBlock() {
  return `\n\n## Output Format — REQUIRED
Every final answer MUST use exactly this envelope (This is important!):
\`<workflow_matches>
[]
</workflow_matches>
<customer_response>
Customer-visible generated response goes here.
</customer_response>
<media_to_send>
[]
</media_to_send>\`

Rules:
- Put only a JSON array inside \`<workflow_matches>\`.
- Include one object for every matching Workflow Runtime node condition. Multiple nodes can match in one turn; do not stop at the first match.
- Each \`<workflow_matches>\` item must set \`matched\` to true and copy the exact matching node \`nodeId\`, \`kind\` as \`nodeKind\`, and \`title\` as \`nodeTitle\`.
- If no workflow node condition matches, output [] inside \`<workflow_matches>\`.
- Execute every node listed in \`<workflow_matches>\`.
- Put all customer-visible text inside \`<customer_response>\`.
- Put only a JSON array inside \`<media_to_send>\`.
- If there is no media to send, output [] inside \`<media_to_send>\`.
- If any matched node sends media, output objects with the matching workflow node \`nodeId\` plus exact \`url\` and \`type\` values copied from each matching Workflow Runtime media node inside \`<media_to_send>\`.
- This applies to images, videos, audio, and files.
- Do not omit \`<media_to_send>\`.
- Do not put any text outside these tags.
- The system strips these tags before sending the customer response.`;
}
