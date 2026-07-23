import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const changelogPath = 'docs/releases/changelog.mdx';
const supportedProducts = new Set(['Kilobot', 'Avatar', 'Docs']);
const categoryOrder = [
  'New features',
  'Improvements',
  'Performance improvements',
  'Bug fixes',
];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function extractEntries(source) {
  return [...source.matchAll(/<article data-product="([^"]+)">([\s\S]*?)<\/article>/g)]
    .map((match) => ({product: match[1], source: match[2]}));
}

test('places Changelog in a Releases sidebar group before Help and support', () => {
  const sidebar = read('sidebars.ts');
  const releasesPosition = sidebar.indexOf("label: 'Releases'");
  const supportPosition = sidebar.indexOf("label: 'Help and support'");

  assert.ok(releasesPosition >= 0, 'Releases sidebar group is missing');
  assert.ok(supportPosition > releasesPosition, 'Releases must appear before Help and support');
  assert.match(
    sidebar.slice(releasesPosition, supportPosition),
    /items: \['releases\/changelog'\]/,
  );
});

test('ships the Markdown changelog route and initial Docs release', () => {
  assert.equal(existsSync(path.join(root, changelogPath)), true, `${changelogPath} is missing`);
  const source = read(changelogPath);

  assert.match(source, /^---\n[\s\S]*title: Changelog\n[\s\S]*description: .+\n[\s\S]*slug: \/releases\/changelog\n[\s\S]*---/);
  assert.match(source, /<a href="#july-2026">July 2026<\/a>/);
  assert.match(source, /^## July 2026$/m);
  assert.match(source, /<article data-product="Docs">/);
  assert.match(source, /<time dateTime="2026-07-23">2026-07-23<\/time>/);
  assert.match(source, /^### Docs — Releases and changelog$/m);
  assert.match(source, /^#### New features$/m);
  assert.match(source, /^- .+$/m);
});

test('publishes the feature-flagged Avatar release for selected workspaces', () => {
  const source = read(changelogPath);
  const avatarEntry = extractEntries(source)
    .find((entry) => entry.product === 'Avatar')?.source;

  assert.ok(avatarEntry, 'Avatar release entry is missing');
  assert.match(avatarEntry, /<time dateTime="2026-07-23">2026-07-23<\/time>/);
  assert.match(avatarEntry, /^### Avatar — Voice avatar preview$/m);
  assert.doesNotMatch(avatarEntry, /^> \*\*Feature flagged:\*\*/m);
  assert.match(
    avatarEntry,
    /^- Added a feature-flagged Avatar preview for selected workspaces,/m,
  );
  assert.match(avatarEntry, /avatar, language, and voice/);
  assert.match(avatarEntry, /voice-only conversations/);
  assert.match(avatarEntry, /HTML or React/);
  assert.match(avatarEntry, /Inbox/);
});

test('keeps every release entry complete, categorized, and newest first', () => {
  const source = read(changelogPath);
  const entries = extractEntries(source);

  assert.ok(entries.length > 0, 'Changelog must contain at least one release entry');

  const dates = entries.map(({product, source: entrySource}) => {
    assert.ok(supportedProducts.has(product), `Unsupported changelog product: ${product}`);

    const date = entrySource.match(
      /<time dateTime="(\d{4}-\d{2}-\d{2})">\1<\/time>/,
    )?.[1];
    assert.ok(date, `${product} entry is missing a matching ISO release date`);
    assert.equal(
      Number.isNaN(Date.parse(`${date}T00:00:00Z`)),
      false,
      `${date} is not a valid release date`,
    );

    const title = entrySource.match(/^### (Kilobot|Avatar|Docs) — (.+)$/m);
    assert.ok(title?.[2]?.trim(), `${product} entry is missing its release title`);
    assert.equal(title[1], product, `${product} entry title uses the wrong product label`);

    const categories = [...entrySource.matchAll(/^#### (.+)$/gm)]
      .map((match) => match[1]);
    assert.ok(categories.length > 0, `${product} entry has no change categories`);
    assert.deepEqual(
      categories,
      [...categories].sort(
        (left, right) => categoryOrder.indexOf(left) - categoryOrder.indexOf(right),
      ),
      `${product} entry categories are out of order`,
    );
    for (const category of categories) {
      assert.ok(categoryOrder.includes(category), `Unsupported changelog category: ${category}`);
    }
    assert.match(entrySource, /^- .+$/m, `${product} entry has no release-note bullets`);

    return date;
  });

  assert.deepEqual(
    dates,
    [...dates].sort((left, right) => right.localeCompare(left)),
    'Changelog entries must be newest first',
  );
});

test('provides scoped responsive changelog presentation styles', () => {
  assert.equal(
    existsSync(path.join(root, 'src/components/ChangelogContent.tsx')),
    true,
    'ChangelogContent component is missing',
  );
  const styles = read('src/components/ChangelogContent.module.css');

  assert.match(styles, /\.changelog article/);
  assert.match(styles, /\.changelog article time/);
  assert.match(styles, /@media \(max-width: 600px\)/);
  assert.match(styles, /\[data-theme='dark'\]/);
});
