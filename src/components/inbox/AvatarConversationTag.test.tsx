import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(path, 'utf8');

describe('Avatar conversation presentation', () => {
  it('uses a permanent neutral system tag in the Inbox', () => {
    const tagSource = readSource('src/components/inbox/AvatarConversationTag.tsx');
    const rowSource = readSource('src/components/ChatRow.tsx');
    const inboxSource = readSource('src/pages/ChatsPage.tsx');

    expect(tagSource).toContain('Avatar');
    expect(tagSource).toContain('bg-muted');
    expect(tagSource).toContain('text-muted-foreground');
    expect(rowSource).toContain('<AvatarConversationTag compact />');
    expect(inboxSource).toContain('<AvatarConversationTag />');
  });
});
