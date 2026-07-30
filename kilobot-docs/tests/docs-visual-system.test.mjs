import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

test('styles every admonition as a borderless semantic surface', () => {
  const customCss = read('src/css/custom.css');
  const admonitionsCss = read('src/css/admonitions.css');

  assert.match(customCss, /^@import '\.\/admonitions\.css';/);
  assert.ok(admonitionsCss.includes('.theme-admonition {'));
  assert.ok(admonitionsCss.includes('border: 0;'));
  assert.ok(admonitionsCss.includes('box-shadow: none;'));
  assert.ok(admonitionsCss.includes('border-radius: 0.875rem;'));
  assert.ok(admonitionsCss.includes('padding: 1.5rem 2rem;'));
  assert.ok(admonitionsCss.includes('padding: 1.25rem;'));
  assert.ok(admonitionsCss.includes('10%'));
  assert.ok(admonitionsCss.includes('18%'));
  assert.ok(admonitionsCss.includes('.theme-admonition-note'));
  assert.ok(admonitionsCss.includes('.theme-admonition-info'));
  assert.ok(admonitionsCss.includes('.theme-admonition-tip'));
  assert.ok(admonitionsCss.includes('.theme-admonition-warning'));
  assert.ok(admonitionsCss.includes('.theme-admonition-caution'));
  assert.ok(admonitionsCss.includes('.theme-admonition-danger'));
});
