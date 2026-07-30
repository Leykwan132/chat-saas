import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

test('configures the public KiloBot domain, local search, and product navigation', () => {
  const config = read('docusaurus.config.ts');
  assert.ok(config.includes("title: 'KiloBot Docs'"));
  assert.ok(config.includes("url: 'https://docs.kilobot.app'"));
  assert.ok(config.includes("'@cmfcmf/docusaurus-search-local'"));
  assert.ok(config.includes("markdown: {hooks: {onBrokenMarkdownLinks: 'throw'}}"));
  assert.equal(config.includes('searchResultLimits'), false);
  assert.ok(config.includes("blog: false"));
  assert.ok(config.includes("href: 'https://kilobot.app'"));
  assert.equal(config.includes("href: 'https://kilobot.app/workspace'"), false);
  assert.ok(config.includes('footer: undefined'));
  assert.equal(config.includes('facebook/docusaurus'), false);
  assert.equal(config.includes('your-docusaurus-site.example.com'), false);
});

test('uses a Docs brand pill instead of Guides and Core concepts navbar links', () => {
  const config = read('docusaurus.config.ts');
  const navbarLogoPath = 'src/theme/Navbar/Logo/index.tsx';
  const navbarLogoStylesPath = 'src/theme/Navbar/Logo/styles.module.css';

  assert.equal(config.includes("label: 'Guides'"), false);
  assert.equal(
    config.includes("{to: '/start-here/core-concepts', label: 'Core concepts', position: 'left'}"),
    false,
  );
  assert.ok(config.includes("label: 'Try KiloBot'"));
  assert.equal(config.includes("label: 'Dashboard'"), false);
  assert.equal(config.includes("label: 'Go to dashboard'"), false);
  assert.equal(existsSync(path.join(root, navbarLogoPath)), true);
  assert.equal(existsSync(path.join(root, navbarLogoStylesPath)), true);
  assert.ok(read(navbarLogoPath).includes('>Docs</span>'));
  assert.ok(read(navbarLogoPath).includes('styles.wordmark'));
  assert.ok(read(navbarLogoStylesPath).includes('background: var(--kilobot-muted)'));
  assert.ok(read(navbarLogoStylesPath).includes('border-radius: 0.375rem'));
  assert.ok(read(navbarLogoStylesPath).includes('gap: 0.4rem'));
  assert.ok(read(navbarLogoStylesPath).includes('align-items: center'));
});

test('uses Geist for body text and dashboard-aligned color tokens', () => {
  const css = read('src/css/custom.css');

  assert.match(css, /--ifm-font-family-base:\s*"Geist"/);
  assert.equal(css.includes('Open Sans'), false);
  assert.equal(css.includes('Google Sans Flex'), false);
  assert.equal(css.includes('Inter,'), false);
  assert.ok(css.includes('--ifm-font-color-secondary: #71717a'));
  assert.ok(css.includes('--ifm-background-color: #212121'));
  assert.ok(css.includes('--kilobot-link:'));
  assert.match(css, /\.theme-doc-markdown h1 \{[\s\S]*font-size: 1\.875rem;[\s\S]*\}/);
  assert.match(
    css,
    /\.theme-doc-markdown\s*\{[^}]*font-size:\s*1\.0625rem;[^}]*line-height:\s*1\.7;/s,
  );
  assert.match(
    css,
    /\.theme-doc-markdown h2\s*\{[^}]*font-size:\s*1\.375rem;/s,
  );
  assert.match(
    css,
    /\.theme-doc-markdown h3\s*\{[^}]*font-size:\s*1\.125rem;/s,
  );
  assert.match(
    css,
    /\.theme-doc-markdown > p:first-of-type\s*\{[^}]*font-size:\s*1\.0625rem;/s,
  );
});

test('keeps the testing screenshot compact on desktop and full-width on mobile', () => {
  const css = read('src/css/custom.css');

  assert.match(
    css,
    /\.docs-image-compact\s*\{[^}]*width:\s*70%;[^}]*margin-inline:\s*auto;/s,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\.docs-image-compact\s*\{[^}]*width:\s*100%;/s,
  );
});

test('styles the top bar like the product header chrome', () => {
  const css = read('src/css/custom.css');
  const navbarCss = read('src/css/navbar.css');
  const config = read('docusaurus.config.ts');
  const navbarRule = navbarCss.match(/\.navbar \{[^}]*\}/)?.[0] ?? '';

  assert.ok(config.includes("'./src/css/navbar.css'"));
  assert.ok(css.includes('--ifm-navbar-height: 3.5rem'));
  assert.match(navbarRule, /border-bottom:/);
  assert.match(navbarRule, /box-shadow: none/);
  assert.doesNotMatch(navbarRule, /backdrop-filter:/);
  assert.match(
    navbarCss,
    /\.navbar-dashboard-link \{[\s\S]*display: inline-flex;[\s\S]*align-items: center;[\s\S]*gap: 0\.35rem;[\s\S]*border-radius: 999px;[\s\S]*\}/,
  );
  assert.match(
    navbarCss,
    /\.navbar-dashboard-link svg \{[\s\S]*width: 0\.875rem;[\s\S]*height: 0\.875rem;[\s\S]*margin: 0;[\s\S]*\}/,
  );
  assert.ok(navbarCss.includes('.aa-DetachedSearchButton'));
  assert.ok(navbarCss.includes('width: 14.5rem'));
  assert.ok(navbarCss.includes('height: 2.25rem'));
});

test('uses Geist for docs content and Gilda for KiloBot marketing titles', () => {
  const config = read('docusaurus.config.ts');
  const css = read('src/css/custom.css');
  const navbarCss = read('src/css/navbar.css');
  const bannerCss = read('src/components/DocQuickstartBanner.module.css');
  const docsFontsUrl =
    'https://fonts.googleapis.com/css2?family=Geist:ital,wght@0,100..900;1,100..900&family=Gilda+Display&display=swap';

  assert.ok(config.includes(docsFontsUrl));
  assert.ok(config.includes("rel: 'preconnect'"));
  assert.equal(config.includes('family=Open+Sans'), false);
  assert.equal(config.includes('Google+Sans+Flex'), false);
  assert.ok(css.includes('--kilobot-font-title: "Gilda Display", serif;'));
  assert.match(css, /--ifm-font-family-base:\s*"Geist"/);
  assert.match(navbarCss, /\.navbar__title \{[\s\S]*font-family: var\(--kilobot-font-title\);/);
  assert.ok(bannerCss.includes('font-family: var(--kilobot-font-title)'));
  assert.match(navbarCss, /\.navbar__title \{[\s\S]*font-size: 20px;[\s\S]*font-weight: 600;[\s\S]*\}/);
});

test('matches the product header spacing between the icon and title', () => {
  const navbarCss = read('src/css/navbar.css');
  const productHeader = read('../src/components/site-header/SiteHeaderBrand.tsx');

  assert.ok(productHeader.includes('items-center gap-2'));
  assert.match(navbarCss, /\.navbar__brand \{[\s\S]*gap: 8px;[\s\S]*\}/);
  assert.match(navbarCss, /\.navbar__logo \{[\s\S]*margin-right: 0;[\s\S]*\}/);
  assert.ok(navbarCss.includes('.navbar__toggle svg'));
  assert.ok(navbarCss.includes('.navbar-sidebar__back'));
  assert.match(
    navbarCss,
    /\.navbar-sidebar__back \{[\s\S]*display: none;/,
  );
  assert.match(
    navbarCss,
    /@media \(max-width: 996px\) \{[\s\S]*\.navbar__brand \{[\s\S]*display: none;/,
  );
});

test('opens the documentation shell at the root without a custom home page', () => {
  const config = read('docusaurus.config.ts');
  const css = read('src/css/custom.css');
  const welcome = read('docs/start-here/welcome.mdx');
  assert.ok(css.includes('--kilobot-font-title'));
  assert.ok(css.includes('--ifm-color-primary:'));
  assert.ok(css.includes("[data-theme='dark']"));
  assert.ok(config.includes("routeBasePath: '/'"));
  assert.match(welcome, /^---\n[\s\S]*slug: \/\n[\s\S]*---/);
  assert.ok(welcome.includes('DocQuickstartBanner'));
  const banner = read('src/components/DocQuickstartBanner.tsx');
  assert.ok(banner.includes('AI Agent for sales'));
  assert.ok(banner.includes('in 5 minutes.'));
  assert.ok(banner.includes('<br />'));
  assert.equal(
    welcome.includes('https://storage.kilobot.app/preview-image'),
    false,
  );
  assert.ok(welcome.includes('DocPathGrid'));
  assert.ok(welcome.includes('DocPathTile'));
  assert.equal(welcome.includes('DocResourceRow'), false);
  assert.equal(welcome.includes('pagination_next: null'), false);
  assert.ok(welcome.includes('pagination_prev: null'));
  assert.ok(welcome.includes('hide_table_of_contents: true'));
  assert.ok(welcome.includes("to: '/start-here/quick-start'"));
  assert.equal(
    [...welcome.matchAll(/<DocPathTile/g)].length,
    2,
  );
  assert.ok(welcome.includes('title="Quick Start"'));
  assert.ok(welcome.includes('title="Browse the guide"'));
  assert.ok(welcome.includes('to="/build-your-agent/agent-setup"'));
  assert.ok(welcome.includes('from \'lucide-react\''));
  assert.equal(existsSync(path.join(root, 'src/pages/index.tsx')), false);
  assert.equal(existsSync(path.join(root, 'src/pages/index.module.css')), false);
  assert.equal(existsSync(path.join(root, 'src/components/HomeCategoryGrid.tsx')), false);
  assert.equal(existsSync(path.join(root, 'src/components/HomeCategoryGrid.module.css')), false);
  assert.ok(welcome.includes("secondary={{label: 'Try KiloBot', to: 'https://kilobot.app'}}"));
  assert.equal(welcome.includes('https://kilobot.app/workspace'), false);
});

test('scopes circular step badges and ships path/card components', () => {
  const css = read('src/css/custom.css');
  const paginationCss = read('src/css/pagination.css');
  const agentSetup = read('docs/build-your-agent/agent-setup.mdx');
  const packageJson = read('package.json');

  assert.ok(css.includes('.theme-doc-markdown ol.steps'));
  assert.equal(css.includes('.theme-doc-markdown ol > li::before'), false);
  assert.ok(
    paginationCss.includes(
      ".pagination-nav__link--prev .pagination-nav__label::before",
    ),
  );
  assert.ok(paginationCss.includes("content: '← '"));
  assert.ok(paginationCss.includes("content: ' →'"));
  assert.match(
    paginationCss,
    /\.pagination-nav__label \{[\s\S]*font-weight: 600;/,
  );
  assert.match(
    paginationCss,
    /\.pagination-nav__sublabel \{[\s\S]*font-weight: 500;/,
  );
  assert.match(
    paginationCss,
    /\.pagination-nav__link,\s*\.pagination-nav__link:hover \{[\s\S]*border: none;/,
  );
  assert.ok(agentSetup.includes('className="steps"'));
  assert.ok(packageJson.includes('"lucide-react"'));
  assert.equal(existsSync(path.join(root, 'src/components/DocPathGrid.tsx')), true);
  assert.equal(existsSync(path.join(root, 'src/components/DocPathTile.tsx')), true);
  assert.ok(read('src/components/DocPathTile.tsx').includes('ArrowRight'));
  assert.ok(read('src/components/DocPathTile.module.css').includes('.tile:hover .arrow'));
  assert.equal(
    read('src/components/DocPathTile.module.css').includes(
      '.tile:hover {\n  background:',
    ),
    false,
  );
  assert.equal(existsSync(path.join(root, 'src/components/DocCard.tsx')), true);
  assert.equal(existsSync(path.join(root, 'src/components/DocQuickstartBanner.tsx')), true);
});

test('uses heading hierarchy with a desktop-only unlabeled page outline', () => {
  const css = read('src/css/custom.css');
  const tocCss = read('src/css/toc.css');
  const config = read('docusaurus.config.ts');
  const tocButton = read('src/theme/TOCCollapsible/CollapseButton/index.tsx');
  const headingTwoRule = css.match(/\.theme-doc-markdown h2 \{[^}]*\}/)?.[0] ?? '';

  assert.doesNotMatch(headingTwoRule, /border-top:/);
  assert.ok(config.includes('tableOfContents:'));
  assert.ok(config.includes('maxHeadingLevel: 4'));
  assert.ok(config.includes('./src/css/toc.css'));
  assert.ok(config.includes('./src/css/pagination.css'));
  assert.equal(tocButton.includes('On this page'), false);
  assert.ok(tocButton.includes('aria-label="Page sections"'));
  assert.match(
    tocCss,
    /\.theme-doc-toc-mobile \{[\s\S]*display: none;[\s\S]*\}/,
  );
  assert.ok(tocCss.includes('.table-of-contents__link--active'));
  const docMainStyles = read('src/theme/DocRoot/Layout/Main/styles.module.css');
  assert.ok(docMainStyles.includes('--doc-content-pad: 1.5rem'));
  assert.ok(docMainStyles.includes('--doc-content-pad-x: 1.25rem'));
  assert.ok(
    docMainStyles.includes(
      '--doc-content-pad-top: calc(var(--doc-content-pad) * 1.15)',
    ),
  );
  assert.ok(docMainStyles.includes('--doc-content-pad: 2.75rem'));
  assert.ok(docMainStyles.includes('--doc-content-pad-x: 0'));
  assert.ok(docMainStyles.includes('@media (min-width: 768px)'));
  assert.ok(docMainStyles.includes('@media (min-width: 997px)'));
  assert.ok(docMainStyles.includes('max-width: none'));
  const bannerStyles = read('src/components/DocQuickstartBanner.module.css');
  assert.ok(bannerStyles.includes('max-width: 60rem'));
  assert.ok(bannerStyles.includes('@media (min-width: 480px)'));
  assert.ok(bannerStyles.includes('@media (min-width: 996px)'));
  assert.match(
    docMainStyles,
    /\.docContent > :global\(\.row\) \{[\s\S]*margin-left: 0;[\s\S]*margin-right: 0;/,
  );
  assert.equal(read('src/theme/DocRoot/Layout/Main/index.tsx').includes('padding-top--md'), false);
});

test('disables doc breadcrumbs', () => {
  const config = read('docusaurus.config.ts');
  const css = read('src/css/custom.css');

  assert.ok(config.includes('breadcrumbs: false'));
  assert.equal(css.includes('.breadcrumbs__link'), false);
});

test('keeps all new code modules below the workspace limit', () => {
  const codeFiles = [
    'docusaurus.config.ts',
    'sidebars.ts',
    'src/css/custom.css',
    'src/css/navbar.css',
    'src/css/toc.css',
    'src/css/pagination.css',
    'src/theme/Navbar/Logo/index.tsx',
    'src/theme/Navbar/Logo/styles.module.css',
    'src/theme/TOCCollapsible/CollapseButton/index.tsx',
    'src/theme/TOCCollapsible/CollapseButton/styles.module.css',
    'src/theme/MDXComponents/Img/index.tsx',
    'src/theme/MDXComponents/Img/styles.module.css',
    'src/theme/MDXComponents/Img/index.test.tsx',
    'src/theme/DocRoot/Layout/Main/index.tsx',
    'src/theme/DocRoot/Layout/Main/styles.module.css',
    'src/components/DocPathGrid.tsx',
    'src/components/DocPathGrid.module.css',
    'src/components/DocPathTile.tsx',
    'src/components/DocPathTile.module.css',
    'src/components/DocCard.tsx',
    'src/components/DocCard.module.css',
    'src/components/DocQuickstartBanner.tsx',
    'src/components/DocQuickstartBanner.module.css',
  ];
  for (const relativePath of codeFiles) {
    assert.equal(existsSync(path.join(root, relativePath)), true, `${relativePath} is missing`);
    const lineCount = read(relativePath).split('\n').length;
    assert.ok(lineCount <= 300, `${relativePath} has ${lineCount} lines`);
  }
});
