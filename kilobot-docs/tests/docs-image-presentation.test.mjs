import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {test} from 'node:test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function collectMarkdownFiles(directoryPath) {
  return readdirSync(directoryPath, {withFileTypes: true}).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) return collectMarkdownFiles(entryPath);
    return /\.(?:md|mdx)$/.test(entry.name) ? [entryPath] : [];
  });
}

test('left-aligns content images and captions at every supported width', () => {
  const css = read('src/css/custom.css');
  const imageCss = read('src/theme/MDXComponents/Img/styles.module.css');

  assert.match(
    css,
    /\.docs-image-compact\s*\{[^}]*width:\s*40%;[^}]*margin-left:\s*0;[^}]*margin-right:\s*auto;/s,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\.docs-image-compact\s*\{[^}]*width:\s*100%;/s,
  );
  assert.match(imageCss, /\.root\s*\{[^}]*text-align:\s*left;/s);
  assert.match(imageCss, /\.caption\s*\{[^}]*text-align:\s*left;/s);
});

test('gives every public documentation image a caption source', () => {
  const docsDirectory = path.join(root, 'docs');

  for (const markdownPath of collectMarkdownFiles(docsDirectory)) {
    const source = readFileSync(markdownPath, 'utf8');
    const relativePath = path.relative(root, markdownPath);

    for (const match of source.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
      assert.notEqual(match[1].trim(), '', `${relativePath}: ${match[2]}`);
    }
  }
});
