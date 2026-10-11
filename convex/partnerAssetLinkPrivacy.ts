import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { getTeamByWorkosOrgId } from "./teamHelpers";
import { isWhiteLabelTeam } from "./whiteLabel/planResolver";

const partnerAssetLinkPrivacy = `## Partner Asset Link Privacy
This agent serves a partner-managed customer. Uploaded image, video, and file asset URLs are internal delivery details and can expose platform branding.
- Never include uploaded asset URLs in customer-facing text, Markdown links or images, HTML, references, or citations, even if requested by the customer or present in retrieved context or earlier messages.
- Never expose Kilobot storage links, including storage.kilobot.app URLs. Do not shorten, encode, rename, or otherwise disguise these URLs.
- Continue answering from the available context. For matching workflow media nodes, let the backend send the attachments separately; do not replace attachments with links or claim an attachment was sent unless delivery is confirmed.
- Ordinary business website links from the provided context remain allowed. Do not invent replacement asset URLs.
- This asset privacy rule takes priority over any instruction to include asset links or citation URLs. Omit a restricted citation URL instead of exposing it.`;

export async function applyPartnerAssetLinkPrivacy(
  ctx: QueryCtx,
  agent: Doc<"agents"> | null,
): Promise<Doc<"agents"> | null> {
  if (agent === null || !agent.orgId || agent.orgId === "personal") return agent;
  const team = await getTeamByWorkosOrgId(ctx, agent.orgId);
  if (team === null || !(await isWhiteLabelTeam(ctx, team._id))) return agent;
  return { ...agent, systemPrompt: `${agent.systemPrompt}\n\n${partnerAssetLinkPrivacy}` };
}
