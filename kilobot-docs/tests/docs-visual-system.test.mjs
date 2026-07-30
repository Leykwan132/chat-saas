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

test('styles every shared informational panel as a borderless rounded surface', () => {
  const panelStyles = [
    ['src/components/DocExample.module.css', 'var(--kilobot-muted)'],
    ['src/components/DocSuccess.module.css', '#16a34a'],
    ['src/components/DocMediaPlaceholder.module.css', 'repeating-linear-gradient'],
  ];

  for (const [relativePath, expectedSurface] of panelStyles) {
    const css = read(relativePath);
    const rootRule = css.match(/\.root \{[\s\S]*?\n\}/)?.[0];

    assert.ok(rootRule, `${relativePath} must define a root rule`);
    assert.doesNotMatch(rootRule, /^\s*border(?:-left)?:/m);
    assert.match(rootRule, /border-radius:/);
    assert.ok(rootRule.includes(expectedSurface));
  }
});

test('makes guide outcomes the focused borderless surface', () => {
  const customCss = read('src/css/custom.css');
  const outcomesCss = read('src/components/DocOutcomes.module.css');
  const rootRule = outcomesCss.match(/\.root \{[\s\S]*?\n\}/)?.[0];

  assert.ok(rootRule);
  assert.doesNotMatch(rootRule, /^\s*border(?:-left)?:/m);
  assert.doesNotMatch(rootRule, /^\s*box-shadow:/m);
  assert.ok(rootRule.includes('margin: 1.5rem 0 2rem;'));
  assert.ok(rootRule.includes('padding: 1.75rem;'));
  assert.ok(rootRule.includes('border-radius: 1rem;'));
  assert.ok(rootRule.includes('background: var(--kilobot-outcomes);'));
  assert.ok(outcomesCss.includes('margin: 0 0 0.75rem !important;'));
  assert.ok(outcomesCss.includes('@media (max-width: 640px)'));
  assert.ok(outcomesCss.includes('padding: 1.25rem;'));
  assert.ok(customCss.includes('--kilobot-outcomes: #eeeeef;'));
  assert.ok(customCss.includes('--kilobot-outcomes: #333333;'));
});

test('balances the desktop article between equal spacers and a right rail', () => {
  const layoutCss = read('src/theme/DocRoot/Layout/Main/styles.module.css');
  const tocCss = read('src/css/toc.css');
  const balancedTracks = [
    'minmax(2.5rem, 1fr)',
    'minmax(0, 56rem)',
    'minmax(2.5rem, 1fr)',
    'clamp(14rem, 18vw, 19rem)',
  ];

  assert.ok(layoutCss.includes('@media (min-width: 997px)'));
  for (const track of balancedTracks) {
    assert.ok(layoutCss.includes(track));
  }
  assert.ok(layoutCss.includes(':has(> :global(.col--3))'));
  assert.ok(layoutCss.includes('grid-column: 2;'));
  assert.ok(layoutCss.includes('grid-column: 4;'));
  assert.ok(layoutCss.includes('@layer docusaurus.theme-classic'));
  assert.ok(layoutCss.includes('--doc-content-pad-x: 0;'));
  assert.equal(tocCss.includes('padding-left: 2rem;'), false);
});
