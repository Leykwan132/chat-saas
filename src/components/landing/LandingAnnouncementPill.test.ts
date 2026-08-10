import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ACTIVE_BLOG_HEADLINE,
  YTL_AI_LABS_LOGO_URL,
} from '../../content/blog/activeHeadline';
import { getBlogPost, requireBlogPost } from '../../content/blog/posts';

const ILMU_IMAGE = 'https://storage.kilobot.app/Ilmu%20Mini%20v3.3.png';

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
    'AI Chatbot for Customer Support and Sales',
  );
  expect(heroSource).toContain(
    'Automate your customer inbox with Kilobot. No complex setup—get started in just 5 minutes.',
  );
  expect(indexSource).toContain('Kilobot | AI Chatbot for Customer Support &amp; Sales');
  expect(indexSource).toContain(
    'Automate customer conversations, answer questions instantly, and grow sales with Kilobot’s AI chatbot. No complex setup—get started in just 5 minutes.',
  );
});
