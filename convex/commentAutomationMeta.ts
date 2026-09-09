type CommentSubscriptionChannel = {
  service: string;
  status: string;
  pageId?: string;
  instagramPageId?: string;
  igUserId?: string;
  accessToken?: string;
};

type GraphErrorBody = {
  id?: string;
  message_id?: string;
  recipient_id?: string;
  from?: { id?: string; name?: string };
  message?: string;
  created_time?: string | number;
  error?: { message?: string; code?: number };
};

export type CommentSendResult =
  | { ok: true; externalId?: string; recipientId?: string }
  | { ok: false; error: string; errorCode?: number };

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || "v25.0";
}

function getSubscriptionTarget(channel: CommentSubscriptionChannel) {
  if (channel.service !== "instagram" && channel.service !== "messenger") {
    throw new Error("Selected page is unavailable");
  }
  const resourceId = channel.service === "messenger"
    ? channel.pageId
    : channel.instagramPageId ?? channel.igUserId;
  if (!resourceId || !channel.accessToken || channel.status !== "connected") {
    throw new Error("Selected page is unavailable");
  }
  return {
    resourceId,
    baseUrl: channel.service === "messenger"
      ? "https://graph.facebook.com"
      : channel.instagramPageId
        ? "https://graph.facebook.com"
        : "https://graph.instagram.com",
    subscribedFields: channel.service === "messenger"
      ? "messages,messaging_postbacks,feed"
      : channel.instagramPageId
        ? "messages,feed"
        : "comments",
  };
}

export async function ensureCommentSubscription(channel: CommentSubscriptionChannel) {
  const target = getSubscriptionTarget(channel);
  if (channel.service === "instagram" && channel.instagramPageId === undefined) {
    return;
  }
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

function getMessengerTarget(channel: CommentSubscriptionChannel) {
  if (
    channel.service !== "messenger" ||
    channel.status !== "connected" ||
    !channel.pageId ||
    !channel.accessToken?.trim()
  ) {
    throw new Error("Messenger page is unavailable");
  }
  return {
    pageId: channel.pageId,
    accessToken: channel.accessToken.trim(),
    baseUrl: `https://graph.facebook.com/${graphVersion()}`,
  };
}

function getInstagramTarget(channel: CommentSubscriptionChannel) {
  if (
    channel.service !== "instagram" ||
    channel.status !== "connected" ||
    !channel.igUserId ||
    !channel.accessToken?.trim()
  ) {
    throw new Error("Instagram account is unavailable");
  }
  return {
    igUserId: channel.igUserId,
    accessToken: channel.accessToken.trim(),
    baseUrl: `https://graph.instagram.com/${graphVersion()}`,
  };
}

async function graphRequest(
  url: string,
  accessToken: string,
  init: RequestInit,
): Promise<{ response: Response; body: GraphErrorBody }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({})) as GraphErrorBody;
  return { response, body };
}

export async function getMessengerComment(
  channel: CommentSubscriptionChannel,
  commentId: string,
) {
  const target = getMessengerTarget(channel);
  const url = new URL(`${target.baseUrl}/${commentId}`);
  url.searchParams.set("fields", "id,message,from,created_time");
  const { response, body } = await graphRequest(
    url.toString(),
    target.accessToken,
    { method: "GET" },
  );
  if (!response.ok) {
    throw new Error(
      body.error?.message ?? `Meta comment fetch failed with HTTP ${response.status}`,
    );
  }
  return {
    id: body.id ?? commentId,
    message: body.message ?? "",
    authorId: body.from?.id,
    authorName: body.from?.name,
    createdAt: body.created_time,
  };
}

async function sendCommentRequest(
  url: string,
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<CommentSendResult> {
  let result: Awaited<ReturnType<typeof graphRequest>>;
  try {
    result = await graphRequest(url, accessToken, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const { response, body } = result;
  if (!response.ok) {
    return {
      ok: false,
      error: body.error?.message ?? `Meta comment send failed with HTTP ${response.status}`,
      errorCode: body.error?.code,
    };
  }
  return {
    ok: true,
    externalId: body.message_id ?? body.id,
    recipientId: body.recipient_id,
  };
}

export async function sendMessengerCommentPrivateReply(
  channel: CommentSubscriptionChannel,
  commentId: string,
  text: string,
) {
  const target = getMessengerTarget(channel);
  return await sendCommentRequest(
    `${target.baseUrl}/${target.pageId}/messages`,
    target.accessToken,
    {
      recipient: { comment_id: commentId },
      message: { text },
    },
  );
}

export async function sendMessengerCommentPublicReply(
  channel: CommentSubscriptionChannel,
  commentId: string,
  text: string,
) {
  const target = getMessengerTarget(channel);
  return await sendCommentRequest(
    `${target.baseUrl}/${commentId}/comments`,
    target.accessToken,
    { message: text },
  );
}

export async function sendInstagramCommentPrivateReply(
  channel: CommentSubscriptionChannel,
  commentId: string,
  text: string,
) {
  const target = getInstagramTarget(channel);
  return await sendCommentRequest(
    `${target.baseUrl}/${target.igUserId}/messages`,
    target.accessToken,
    {
      recipient: { comment_id: commentId },
      message: { text },
    },
  );
}

export async function sendInstagramCommentPublicReply(
  channel: CommentSubscriptionChannel,
  commentId: string,
  text: string,
) {
  const target = getInstagramTarget(channel);
  return await sendCommentRequest(
    `${target.baseUrl}/${commentId}/replies`,
    target.accessToken,
    { message: text },
  );
}
