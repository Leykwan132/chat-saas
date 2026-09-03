import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./avatarCover.ts', import.meta.url), 'utf8');

describe('Avatar media upload ownership', () => {
  it('uses the workspace Avatar configuration agent for generated media keys', () => {
    expect(source).toContain('generateAvatarCoverKey(configuration.orgId, configuration.agentId, mimeType)');
    expect(source).toContain('generateAvatarBackgroundKey(configuration.orgId, configuration.agentId, mimeType)');
  });

  it('validates saved media against the same configuration-owned namespace', () => {
    expect(source).toContain('orgId: configuration.orgId,\n      agentId: configuration.agentId');
  });
});
