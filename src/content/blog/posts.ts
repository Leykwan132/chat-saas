import supportingIlmuMarkdown from './supporting-ilmu.md?raw';

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  category: string;
  markdown: string;
};

const postsBySlug: Record<string, BlogPost> = {
  'supporting-ilmu': {
    slug: 'supporting-ilmu',
    title: 'Ilmu for everyone',
    date: 'July 10, 2026',
    category: 'Product',
    markdown: supportingIlmuMarkdown,
  },
};

export function getBlogPost(slug: string): BlogPost | null {
  return postsBySlug[slug] ?? null;
}

export function requireBlogPost(slug: string): BlogPost {
  const post = getBlogPost(slug);
  if (!post) {
    throw new Error(`Missing blog post for slug: ${slug}`);
  }
  return post;
}
