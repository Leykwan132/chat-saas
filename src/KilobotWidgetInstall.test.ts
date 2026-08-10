import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('installs the supplied Kilobot website widget', () => {
  expect(indexHtml).toContain(`<script
    async
    src="https://kilobot.app/widget/v1.js"
    data-kilobot-widget="pub_db21708de03541e6bfc50e6a25d9dc52"
  ></script>`);
});
