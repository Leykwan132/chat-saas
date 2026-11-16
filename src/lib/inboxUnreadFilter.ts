export function filterUnreadChats<T extends { id: string; unread: number }>(
  chats: T[],
  selectedConversationId: string | null,
): T[] {
  return chats.filter((chat) => chat.unread > 0 || chat.id === selectedConversationId);
}
