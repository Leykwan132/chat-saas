type AgentWhatsAppChannel = {
  wabaId?: string;
  status: "pending" | "connected" | "disconnected" | "error";
};

export function assertAgentCanConnectWhatsApp(
  channels: AgentWhatsAppChannel[],
  incomingWabaId: string,
): void {
  const conflictingChannel = channels.find(
    (channel) =>
      channel.status !== "disconnected" &&
      channel.wabaId !== undefined &&
      channel.wabaId !== incomingWabaId,
  );
  if (conflictingChannel !== undefined) {
    throw new Error(
      "This agent already has a different WhatsApp account connected.",
    );
  }
}
