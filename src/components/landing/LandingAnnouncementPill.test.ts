import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import {
  ACTIVE_BLOG_HEADLINE,
  YTL_AI_LABS_LOGO_URL,
} from '../../content/blog/activeHeadline';
import { getBlogPost, requireBlogPost } from '../../content/blog/posts';
import { LandingHero } from './LandingHero';

const ILMU_IMAGE = 'https://storage.kilobot.app/Ilmu%20Mini%20v3.3.png';
const LANDING_PREVIEW_IMAGE = 'https://storage.kilobot.app/Landing/Preview-image.png';

test('active headline points at the supporting-ilmu post', () => {
  expect(ACTIVE_BLOG_HEADLINE.slug).toBe('supporting-ilmu');
  expect(ACTIVE_BLOG_HEADLINE.linkLabel).toBe('Read more');
  expect(ACTIVE_BLOG_HEADLINE.afterLogo).toBe('Ilmu for everyone');
  expect(ACTIVE_BLOG_HEADLINE.afterLogo).not.toContain('YTL');
  expect(ACTIVE_BLOG_HEADLINE.logoUrl).toBe(YTL_AI_LABS_LOGO_URL);
  expect(YTL_AI_LABS_LOGO_URL).toContain('ytl_ai_labs-removebg-compact.png');

  const post = requireBlogPost(ACTIVE_BLOG_HEADLINE.slug);
  expect(post.title).toBe(ACTIVE_BLOG_HEADLINE.afterLogo);
  expect(post.markdown).toContain(ILMU_IMAGE);
  expect(post.markdown).toContain('Free plan');
  expect(getBlogPost('missing-post')).toBeNull();
});

test('landing pill links to the active blog post', () => {
  const pillSource = readFileSync(
    new URL('./LandingAnnouncementPill.tsx', import.meta.url),
    'utf8',
  );
  const heroSource = readFileSync(new URL('./LandingHero.tsx', import.meta.url), 'utf8');
  const mainSource = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');

  expect(pillSource).toContain('ACTIVE_BLOG_HEADLINE');
  expect(pillSource).toContain('logoUrl');
  expect(pillSource).toContain('ArrowRight');
  expect(pillSource).toContain('`/blog/${slug}`');
  expect(heroSource).toContain('LandingAnnouncementPill');
  expect(mainSource).toContain('path="/blog/:slug"');
  expect(mainSource).toContain('BlogPostPage');
});

test('landing hero and metadata describe Kilobot as an easy-to-start AI chatbot', () => {
  const heroSource = readFileSync(new URL('./LandingHero.tsx', import.meta.url), 'utf8');
  const indexSource = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');

  expect(heroSource).toContain(
    'AI Agent for Every Inbox',
  );
  expect(heroSource).toContain('Handle customer support and sales conversations in one place.');
  expect(heroSource).toContain('<span className="block">No complex setup—get started in just 5 minutes.</span>');
  expect(heroSource).not.toContain('Automate your customer inbox with Kilobot.');
  expect(indexSource).toContain('Kilobot | AI Agent for Every Inbox');
  expect(indexSource).toContain(
    'Kilobot’s AI chatbot handles customer support and sales conversations in one place. No complex setup—get started in just 5 minutes.',
  );
  expect(indexSource).toContain(
    `<meta property="og:image" content="${LANDING_PREVIEW_IMAGE}" />`,
  );
  expect(indexSource).toContain(
    `<meta name="twitter:image" content="${LANDING_PREVIEW_IMAGE}" />`,
  );
});

test('landing hero is left aligned with smaller supporting copy on mobile', () => {
  const markup = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(LandingHero, { hasSession: false, onSignUp: () => undefined }),
    ),
  );
  const contentClasses = markup.match(/<div class="([^"]*min-h-\[60svh\][^"]*)">/)?.[1];
  const descriptionClasses = markup.match(
    /<p class="([^"]*)"><span class="block">Handle customer support/,
  )?.[1];
  const titleClasses = markup.match(
    /<h1 class="([^"]*)">AI Agent for Every Inbox<\/h1>/,
  )?.[1];

  expect(contentClasses?.split(' ')).toEqual(
    expect.arrayContaining(['items-start', 'text-left', 'sm:items-center', 'sm:text-center']),
  );
  expect(titleClasses?.split(' ')).toEqual(
    expect.arrayContaining(['text-[28px]', 'sm:text-[38px]']),
  );
  expect(descriptionClasses?.split(' ')).toEqual(
    expect.arrayContaining(['text-sm', 'leading-5', 'sm:text-lg', 'sm:leading-relaxed']),
  );
});
