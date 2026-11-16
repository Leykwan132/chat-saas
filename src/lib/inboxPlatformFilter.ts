import type { ConversationPlatform } from '@/components/ChatRow';

export function toggleInboxPlatform(
  selected: ConversationPlatform[],
  platform: ConversationPlatform,
): ConversationPlatform[] {
  return selected.includes(platform)
    ? selected.filter((value) => value !== platform)
    : [...selected, platform];
}

export function filterInboxPlatforms<T extends { platform: ConversationPlatform }>(
  chats: T[],
  selected: ConversationPlatform[],
): T[] {
  return selected.length === 0 ? chats : chats.filter((chat) => selected.includes(chat.platform));
}
