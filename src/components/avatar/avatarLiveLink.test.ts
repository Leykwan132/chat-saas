import { describe, expect, it } from 'vitest';
import { buildAvatarLiveUrl } from '../../lib/avatarEmbed';

describe('Avatar live link', () => {
  it('builds a public live URL from the Avatar key', () => {
    expect(buildAvatarLiveUrl('agent key')).toBe('https://kilobot.app/avatar/embed/agent%20key');
  });
});
