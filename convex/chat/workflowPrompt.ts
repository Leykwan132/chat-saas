import type { Id } from "../_generated/dataModel";

type RuntimeService = {
  serviceId: Id<"appointmentServices">;
  name: string;
  description?: string;
  durationMinutes: number;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
  }>;
};

type RuntimeMediaAsset = {
  clientId: string;
  filename?: string;
  mediaType: string;
  url: string;
};

export type WorkflowRuntimeContextForPrompt = {
  workflowId: Id<"workflows">;
  nodes: Array<{
    nodeId: Id<"workflowNodes">;
    kind: string;
    title: string;
    goal?: string;
    notes?: string;
    incomingConditions: Array<{
      sourceNodeId: Id<"workflowNodes">;
      name?: string;
      detail?: string;
    }>;
    allowedServices: RuntimeService[];
    mediaAssets: RuntimeMediaAsset[];
  }>;
  edges: Array<{
    sourceNodeId: Id<"workflowNodes">;
    targetNodeId: Id<"workflowNodes">;
    name?: string;
    detail?: string;
  }>;
} | null;

function formatCondition(condition: {
  name?: string;
  detail?: string;
}) {
  const name = condition.name?.trim();
  const detail = condition.detail?.trim();
  if (name && detail) return `Name: ${name}; Detail: ${detail}`;
  if (name) return `Name: ${name}`;
  if (detail) return `Detail: ${detail}`;
  return "No explicit condition";
}

function formatServices(services: RuntimeService[]) {
  if (services.length === 0) return "- Allowed Services: none";
  return [
    "- Allowed Services:",
    ...services.map((service) => {
      const fields = service.fields
        .map((field) => `${field.label} (key: ${field.key})`)
        .join(", ");
      const description = service.description ? ` - ${service.description}` : "";
      return `  - ${service.name} (${service.durationMinutes} min, ID: ${service.serviceId})${description}. Required fields: ${fields}`;
    }),
  ].join("\n");
}

function formatMediaAssets(mediaAssets: RuntimeMediaAsset[]) {
  if (mediaAssets.length === 0) return "- Media assets: none uploaded";
  return [
    "- Media assets:",
    ...mediaAssets.map((asset) => {
      const filename = asset.filename ? `, file: ${asset.filename}` : "";
      return `  - url: ${asset.url}${filename}, type: ${asset.mediaType}`;
    }),
  ].join("\n");
}

function firstMediaAsset(context: NonNullable<WorkflowRuntimeContextForPrompt>) {
  return firstMediaNodeWithAsset(context)?.asset;
}

function firstMediaNodeWithAsset(context: NonNullable<WorkflowRuntimeContextForPrompt>) {
  return context.nodes
    .filter((node) => node.kind === "sendImage" || node.kind === "sendFile")
    .flatMap((node) =>
      node.mediaAssets.map((asset) => ({ node, asset })),
    )
    .find(({ asset }) => asset.url.trim().length > 0);
}

function hasMediaNode(context: NonNullable<WorkflowRuntimeContextForPrompt>) {
  return context.nodes.some((node) => node.kind === "sendImage" || node.kind === "sendFile");
}

export function buildWorkflowFinalResponseContractBlock(context: WorkflowRuntimeContextForPrompt) {
  if (context === null || !hasMediaNode(context)) return "";

  const mediaManifestAsset = firstMediaAsset(context);
  const mediaManifestNode = firstMediaNodeWithAsset(context)?.node;
  const mediaManifestUrl = mediaManifestAsset?.url ?? "exact-url-from-media-assets";
  const mediaManifestType = mediaManifestAsset?.mediaType ?? "media/type-from-media-assets";
  const mediaManifestNodeId = mediaManifestNode?.nodeId ?? "matching-node-id";
  const mediaManifestNodeKind = mediaManifestNode?.kind ?? "sendImage-or-sendFile";
  const mediaManifestNodeTitle = mediaManifestNode?.title ?? "Matching media node";

  return `\n\n## Final Response Contract — REQUIRED
This is the required final answer format for this workflow. Never output plain text as the final answer.

Every final answer you send to the customer MUST use this envelope:
\`<workflow_matches>
[]
</workflow_matches>
<customer_response>
Customer-visible text only.
</customer_response>
<media_to_send>
[]
</media_to_send>\`

Build the final response from these data sources, in this order:
1. Workflow Runtime is the source of truth for which nodes are active. Match the latest customer message against all node goals and incoming conditions.
2. After \`fetchContext\`, build \`<workflow_matches>\` as a JSON array. Put only a JSON array inside \`<workflow_matches>\`. Include every matching workflow node in \`<workflow_matches>\`, do not stop at the first match, and list each node once even if multiple conditions on that node match. Each item must set \`matched\` to true and copy the exact matching node \`nodeId\`, \`kind\` as \`nodeKind\`, and \`title\` as \`nodeTitle\`; if no node matches, output [].
3. Execute every node listed in \`<workflow_matches>\`.
4. Media assets listed under each matching workflow media node are the only valid source for media URLs. Copy the matching workflow node \`nodeId\` plus exact \`url\` and \`type\` values from each matching media node's Media assets into \`<media_to_send>\`.
5. Use \`fetchContext\` only for customer-facing facts, names, labels, or short wording inside \`<customer_response>\`. Do not use it to invent media URLs.
6. Use the workflow node goals and incoming conditions to decide whether media should be sent now, including repeat requests.
7. After choosing the data, construct the final response envelope. Do not answer first and then decide media later.

If a Send Photo/Video or Send Files node matches, \`<media_to_send>\` MUST contain a JSON array of objects using the matching workflow node \`nodeId\` plus exact workflow media \`url\` and \`type\` values, for example:
\`<workflow_matches>
[
  { "matched": true, "nodeId": "${mediaManifestNodeId}", "nodeKind": "${mediaManifestNodeKind}", "nodeTitle": "${mediaManifestNodeTitle}" }
]
</workflow_matches>
<customer_response>
Here's the media.
</customer_response>
<media_to_send>
[
  { "nodeId": "${mediaManifestNodeId}", "url": "${mediaManifestUrl}", "type": "${mediaManifestType}" }
]
</media_to_send>\`

If any item in \`workflow_matches\` has \`nodeKind\` \`sendImage\` or \`sendFile\`, \`<media_to_send>\` must contain at least one exact \`nodeId\`, \`url\`, and \`type\` object from each matching media node. Do not put any text outside these tags. Do not omit \`<media_to_send>\`; use [] when no media should be sent. The system strips these tags before the customer sees the message.`;
}

function buildServiceBoundaryRules() {
  return `\n\n## Service Booking Boundary
Services and knowledge-base context have different jobs:
- Services listed under a Book appointment node are the only bookable inventory. A customer can book only one of those listed Services by service ID.
- Knowledge-base results are supporting context only. They may explain services, symptoms, products, prices, policies, benefits, links, or terms customers use, but they never create an additional bookable Service.
- Use knowledge-base context to semantically match customer intent to the closest listed Service. Matching can use related terms, descriptions, links, procedures, outcomes, or customer phrasing; it does not need exact keyword overlap.
- If the customer's request is described in the knowledge base but no listed Service can reasonably fulfill it, answer the informational part from the knowledge base and do not offer to book it. If human escalation is available and booking intent remains unresolved, escalate.
- If a listed Service has a sparse description but knowledge-base context clearly explains that same service, use that context to guide the customer toward the listed Service. Start booking only with the listed Service's service ID.
- If multiple listed Services could fit, briefly explain the relevant options and ask the customer which one they want.
- Do not invent, rename, bundle, split, or imply availability for Services that are not listed under the active Book appointment node.`;
}

export function buildWorkflowRuntimeBlock(context: WorkflowRuntimeContextForPrompt) {
  if (context === null || context.nodes.length === 0) return "";

  const mediaManifestNodeWithAsset = firstMediaNodeWithAsset(context);
  const mediaManifestAsset = mediaManifestNodeWithAsset?.asset;
  const mediaManifestNode = mediaManifestNodeWithAsset?.node;
  const mediaManifestUrl = mediaManifestAsset?.url ?? "exact-url-from-media-assets";
  const mediaManifestType = mediaManifestAsset?.mediaType ?? "media/type-from-media-assets";
  const mediaManifestNodeId = mediaManifestNode?.nodeId ?? "matching-node-id";
  const mediaManifestNodeKind = mediaManifestNode?.kind ?? "sendImage-or-sendFile";
  const mediaManifestNodeTitle = mediaManifestNode?.title ?? "Matching media node";

  const nodeSections = context.nodes
    .map((node, index) => {
      const incoming = node.incomingConditions.length === 0
        ? "- Incoming conditions: message enters here"
        : [
            "- Incoming conditions:",
            ...node.incomingConditions.map((condition) => `  - ${formatCondition(condition)}`),
          ].join("\n");
      const goal = node.goal ? `- Goal: ${node.goal}` : undefined;
      const notes = node.notes ? `- Notes: ${node.notes}` : undefined;
      const services = node.kind === "bookAppointment" ? formatServices(node.allowedServices) : undefined;
      const mediaAssets =
        node.kind === "sendImage" || node.kind === "sendFile"
          ? formatMediaAssets(node.mediaAssets)
          : undefined;
      return [
        `### ${index + 1}. ${node.title} (${node.kind})`,
        `- Node ID: ${node.nodeId}`,
        incoming,
        goal,
        notes,
        services,
        mediaAssets,
      ].filter((line): line is string => line !== undefined).join("\n");
    })
    .join("\n\n");

  return `\n\n## Workflow Runtime
Use this workflow as the source of truth for what stage the conversation is in and what you should do next. Infer the active node each turn from the latest customer message, the message history, each node goal, and the incoming edge conditions. Do not store or invent a persistent conversation stage.

Multiple workflow node conditions can match in one turn. Include every matching workflow node in \`<workflow_matches>\`. Execute every node listed in \`<workflow_matches>\`. Do not stop at the first match. If multiple conditions on the same node match, list that node once. If no action node condition matches, continue with the normal support/sales response rules.

For Send message nodes, send the configured message when the incoming condition matches. Keep the response focused on that configured message unless the customer asks for a necessary clarification.

After \`fetchContext\`, build \`<workflow_matches>\` as a JSON array before writing the customer response. If workflow node conditions match the latest customer message, include one object for every matching workflow node. Each object must set \`matched\` to true and copy the exact matching node \`nodeId\`, \`kind\` as \`nodeKind\`, and \`title\` as \`nodeTitle\`; otherwise output []. Example:
\`<workflow_matches>
[
  { "matched": true, "nodeId": "${mediaManifestNodeId}", "nodeKind": "${mediaManifestNodeKind}", "nodeTitle": "${mediaManifestNodeTitle}" }
]
</workflow_matches>\`

For Send Photo/Video and Send Files nodes, You MUST include the media in \`<media_to_send>\` every time the customer asks for that media and the incoming condition matches, even if the same asset was sent earlier. Do not answer that the media was already sent without declaring it. Use only the matching workflow node \`nodeId\` plus exact \`url\` and \`type\` values listed under that node's Media assets. Put the customer-visible message inside \`<customer_response>\` and put a JSON array inside \`<media_to_send>\`, like:
\`<customer_response>
Here it is.
</customer_response>
<media_to_send>
[
  { "nodeId": "${mediaManifestNodeId}", "url": "${mediaManifestUrl}", "type": "${mediaManifestType}" }
]
</media_to_send>\`
If any item in \`workflow_matches\` has \`nodeKind\` \`sendImage\` or \`sendFile\`, \`<media_to_send>\` must contain at least one exact \`nodeId\`, \`url\`, and \`type\` object from each matching media node's Media assets.
For sendFile nodes, customer words such as brochure, PDF, document, file, catalog, menu, or attachment mean the matching node's Media assets must be copied into \`<media_to_send>\`. Do not say "Here's the brochure", "I've attached the file", or similar unless \`<media_to_send>\` contains the exact file \`nodeId\`, \`url\`, and \`type\` from that sendFile node.
The system strips these tags before sending, validates the media URLs against the active workflow, and sends the files separately. Do not include media URLs or \`[MEDIA:...]\` markers inside \`<customer_response>\`. Do not use tool calls for Send message, Q&A, booking, lead qualification, or custom action nodes.

For Human escalation nodes, call \`escalateToHuman\` when the incoming condition matches. Adding a Human escalation node enables human escalation mode for this workflow, so if you cannot answer safely or confidently while that node exists, escalate instead of guessing.

For Book appointment nodes, use only the Services listed on that node. Start a new booking only when the workflow conditions indicate Book appointment or when the customer explicitly asks to book. Reschedule and cancellation requests for an existing appointment may use the booking tools even if the current turn is about changing or cancelling rather than creating a new booking.
${buildServiceBoundaryRules()}

${nodeSections}`;
}
