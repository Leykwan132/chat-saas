"use node";

import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

const DEFAULT_GRAPH_VERSION = "v25.0";
const PAGE_SIZE = 20;

type MetaChannel = Pick<
  Doc<"channels">,
  "service" | "wabaId" | "igUserId" | "pageId" | "accessToken"
>;

type ChannelPageResult = {
  done: boolean;
  cursor?: string;
};

function metaResourceId(channel: MetaChannel): string | undefined {
  if (channel.service === "whatsapp") return channel.wabaId;
  if (channel.service === "instagram") return channel.igUserId;
  if (channel.service === "messenger") return channel.pageId;
  return undefined;
}

export async function disconnectMetaChannel(
  channel: MetaChannel,
): Promise<void> {
  const resourceId = metaResourceId(channel);
  if (!resourceId || !channel.accessToken) return;
  const graphVersion =
    process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${resourceId}/subscribed_apps`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${channel.accessToken}` },
    },
  );
  if (response.ok || response.status === 404) return;
  const body = await response.text();
  throw new Error(
    `Meta channel disconnect failed with HTTP ${response.status}: ${body}`,
  );
}

export async function disconnectChannelPage(
  ctx: ActionCtx,
  jobId: Id<"teamDeletionJobs">,
  cursor?: string,
): Promise<ChannelPageResult> {
  const page = await ctx.runQuery(
    internal.teamDeletion.externalState.getChannelPage,
    {
      jobId,
      paginationOpts: { numItems: PAGE_SIZE, cursor: cursor ?? null },
    },
  );
  if (!page) return { done: true };
  for (const channel of page.page) {
    await disconnectMetaChannel(channel);
    await ctx.runMutation(
      internal.teamDeletion.externalState.clearChannelCredential,
      { channelId: channel._id },
    );
  }
  return page.isDone
    ? { done: true }
    : { done: false, cursor: page.continueCursor };
}
