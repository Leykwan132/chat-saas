import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('formats distinct Reminder and Follow-up Action History entries', () => {
  const presentation = source('./conversationActionHistoryPresentation.tsx');
  expect(presentation).toContain("case 'reminder_sent'");
  expect(presentation).toContain('Reminder sent:');
  expect(presentation).toContain('metadata?.message');
  expect(presentation).toContain('BellRing');
  expect(presentation).toContain("case 'followup_sent'");
  expect(presentation).toContain('Follow-up sent:');
  expect(presentation).toContain('Clock3');
});

test('keeps Action History presentation out of the Chats page', () => {
  const chatsPage = source('../../pages/ChatsPage.tsx');
  expect(chatsPage).toContain('formatConversationActionHistoryText');
  expect(chatsPage).toContain('getConversationActionHistoryStyle');
  expect(chatsPage).not.toContain('const formatLogActionText');
  expect(chatsPage).not.toContain('const getLogActionStyle');
  expect(chatsPage).toContain('function formatOrgMemberDisplayName');
});
