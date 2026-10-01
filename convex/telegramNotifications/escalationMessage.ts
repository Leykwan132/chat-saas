const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
  web: "Website",
  avatar: "Avatar",
  playground: "Test chat",
};

export function escalationChannelLabel(service: string): string {
  return channelLabels[service] ?? service;
}

export function escalationInboxUrl(origin: string, agentId: string, conversationId: string): string {
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams({ conversation: conversationId });
  return `${base}/dashboard/${agentId}/inbox?${params.toString()}`;
}
