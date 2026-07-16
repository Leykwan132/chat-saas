import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

test('configures the public KiloBot domain, local search, and product navigation', () => {
  const config = read('docusaurus.config.ts');
  assert.ok(config.includes("title: 'KiloBot Help Center'"));
  assert.ok(config.includes("url: 'https://docs.kilobot.app'"));
  assert.ok(config.includes("'@cmfcmf/docusaurus-search-local'"));
  assert.ok(config.includes("blog: false"));
  assert.ok(config.includes("href: 'https://kilobot.app/workspace'"));
  assert.ok(config.includes("href: 'https://kilobot.app'"));
  assert.equal(config.includes('facebook/docusaurus'), false);
  assert.equal(config.includes('your-docusaurus-site.example.com'), false);
});

test('uses the KiloBot visual system across the shell and home page', () => {
  const css = read('src/css/custom.css');
  const home = read('src/pages/index.tsx');
  assert.ok(css.includes('--kilobot-font-title'));
  assert.ok(css.includes('--ifm-color-primary:'));
  assert.ok(css.includes("[data-theme='dark']"));
  assert.ok(home.includes('Search the KiloBot help center'));
  assert.ok(home.includes('Get your first agent live'));
  assert.ok(home.includes('HomeCategoryGrid'));
  assert.equal(home.includes('Dinosaurs are cool'), false);
});

test('keeps all new code modules below the workspace limit', () => {
  const codeFiles = [
    'docusaurus.config.ts',
    'sidebars.ts',
    'src/pages/index.tsx',
    'src/pages/index.module.css',
    'src/css/custom.css',
    'src/components/HomeCategoryGrid.tsx',
    'src/components/HomeCategoryGrid.module.css',
  ];
  for (const relativePath of codeFiles) {
    const lineCount = read(relativePath).split('\n').length;
    assert.ok(lineCount <= 300, `${relativePath} has ${lineCount} lines`);
  }
});
