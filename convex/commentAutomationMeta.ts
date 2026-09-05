type CommentSubscriptionChannel = {
  service: string;
  status: string;
  pageId?: string;
  igUserId?: string;
  accessToken?: string;
};

type GraphErrorBody = {
  error?: { message?: string };
};

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || "v25.0";
}

function getSubscriptionTarget(channel: CommentSubscriptionChannel) {
  if (channel.service !== "instagram" && channel.service !== "messenger") {
    throw new Error("Selected page is unavailable");
  }
  const resourceId = channel.service === "messenger" ? channel.pageId : channel.igUserId;
  if (!resourceId || !channel.accessToken || channel.status !== "connected") {
    throw new Error("Selected page is unavailable");
  }
  return {
    resourceId,
    baseUrl: channel.service === "messenger"
      ? "https://graph.facebook.com"
      : "https://graph.instagram.com",
    subscribedFields: channel.service === "messenger"
      ? "messages,messaging_postbacks,feed"
      : "comments",
  };
}

export async function ensureCommentSubscription(channel: CommentSubscriptionChannel) {
  const target = getSubscriptionTarget(channel);
  const url = new URL(`${target.baseUrl}/${graphVersion()}/${target.resourceId}/subscribed_apps`);
  url.searchParams.set("subscribed_fields", target.subscribedFields);
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${channel.accessToken}` },
  });
  if (response.ok) return;

  const body = await response.json().catch(() => ({})) as GraphErrorBody;
  throw new Error(body.error?.message ?? `Meta subscription failed with HTTP ${response.status}`);
}
