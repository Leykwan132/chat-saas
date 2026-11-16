import { expect, test } from 'vitest';
import { filterUnreadChats } from './inboxUnreadFilter';

test('keeps the active chat after it becomes read without retaining other read chats', () => {
  const chats = [
    { id: 'active', unread: 2 },
    { id: 'next', unread: 1 },
    { id: 'read', unread: 0 },
  ];
  expect(filterUnreadChats(chats, 'active').map((chat) => chat.id)).toEqual(['active', 'next']);
  chats[0].unread = 0;
  expect(filterUnreadChats(chats, 'active').map((chat) => chat.id)).toEqual(['active', 'next']);
  expect(chats[0].unread).toBe(0);
  expect(filterUnreadChats(chats, 'next').map((chat) => chat.id)).toEqual(['next']);
});

test('a fresh unread view excludes read chats', () => {
  expect(filterUnreadChats([{ id: 'read', unread: 0 }], null)).toEqual([]);
});

test('does not restore an active chat removed by another filter or deletion', () => {
  expect(filterUnreadChats([{ id: 'other', unread: 1 }], 'active')).toEqual([
    { id: 'other', unread: 1 },
  ]);
});
