type InstagramChannelTarget = {
  instagramPageId?: string;
};

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || "v25.0";
}

export function instagramObjectBase(channel: InstagramChannelTarget) {
  const host = channel.instagramPageId
    ? "https://graph.facebook.com"
    : "https://graph.instagram.com";
  return `${host}/${graphVersion()}`;
}

export function instagramAccountId(channel: InstagramChannelTarget) {
  return channel.instagramPageId ?? "me";
}

export function instagramMessagingUrl(channel: InstagramChannelTarget) {
  return `${instagramObjectBase(channel)}/${instagramAccountId(channel)}/messages`;
}

export function instagramSenderActionUrl() {
  return `https://graph.facebook.com/${graphVersion()}/me/messages`;
}

export function instagramConversationsUrl(channel: InstagramChannelTarget) {
  return `${instagramObjectBase(channel)}/${instagramAccountId(channel)}/conversations`;
}
