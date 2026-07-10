import {
  BROADCAST_MESSAGE_KIND,
  type BroadcastMessageKind,
  type BroadcastPresentation,
} from "../../shared/broadcastMessage";

export type BroadcastAgentMessageMetadata = {
  inboxMessageKind?: BroadcastMessageKind;
  broadcastPresentation?: BroadcastPresentation;
};

type BroadcastLedgerMetadata = {
  messageKind?: BroadcastMessageKind;
  broadcastPresentation?: BroadcastPresentation;
};

export function broadcastAgentMetadata(
  messageKind: BroadcastMessageKind | undefined,
  broadcastPresentation: BroadcastPresentation | undefined,
): BroadcastAgentMessageMetadata {
  if (messageKind !== BROADCAST_MESSAGE_KIND) return {};
  return {
    inboxMessageKind: messageKind,
    ...(broadcastPresentation ? { broadcastPresentation } : {}),
  };
}

export function resolveBroadcastMetadata(
  agentMetadata: BroadcastAgentMessageMetadata,
  ledgerMetadata: BroadcastLedgerMetadata | undefined,
) {
  const isBroadcast =
    (agentMetadata.inboxMessageKind ?? ledgerMetadata?.messageKind) ===
    BROADCAST_MESSAGE_KIND;
  const broadcastPresentation =
    agentMetadata.broadcastPresentation ?? ledgerMetadata?.broadcastPresentation;
  return {
    isBroadcast,
    ...(isBroadcast && broadcastPresentation ? { broadcastPresentation } : {}),
  };
}
