import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('Facebook SDK initialization', () => {
  it('logs and initializes with the Vite Meta App ID environment value', () => {
    expect(indexHtml).toContain("const metaAppId = '%VITE_META_APP_ID%'");
    expect(indexHtml).toContain("console.log('[meta] Facebook SDK app ID:', metaAppId)");
    expect(indexHtml).toContain('appId: metaAppId');
    expect(indexHtml).not.toContain("appId: '999704942713974'");
  });
});
