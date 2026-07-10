import { Link, Navigate, useParams } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { usePostHog } from '@posthog/react';
import Markdown from 'react-markdown';
import { BlogPostLayout } from '@/components/BlogPostLayout';
import { getBlogPost } from '@/content/blog/posts';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { cn } from '@/lib/utils';

const BLOG_BODY_CLASS_NAME = cn(
  'space-y-6 text-[15px] leading-7 text-zinc-600 sm:text-base sm:leading-8 dark:text-zinc-400',
  '[&_a]:text-zinc-950 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-70 dark:[&_a]:text-white',
  '[&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:tracking-tight [&_h2]:text-zinc-950 sm:[&_h2]:text-2xl dark:[&_h2]:text-white',
  '[&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-zinc-950 dark:[&_h3]:text-white',
  '[&_p]:text-pretty',
  '[&_ul]:space-y-2 [&_li]:ml-5 [&_li]:list-disc',
  '[&_img]:my-10 [&_img]:block [&_img]:h-auto [&_img]:w-full [&_img]:max-w-none [&_img]:rounded-2xl',
);

export default function BlogPostPage() {
  const { slug } = useParams();
  const { user, signUp } = useAuth();
  const posthog = usePostHog();
  const post = slug ? getBlogPost(slug) : null;
  const hasSession = Boolean(user);

  if (!post) {
    return <Navigate to="/" replace />;
  }

  const onSignUp = () => {
    posthog?.capture('signup_cta_clicked', { source: 'blog_post', slug: post.slug });
    void signUp({ state: { returnTo: POST_LOGIN_REDIRECT } });
  };

  return (
    <BlogPostLayout title={post.title} date={post.date} category={post.category}>
      <article className={BLOG_BODY_CLASS_NAME}>
        <Markdown>{post.markdown}</Markdown>
      </article>
      <p className="mt-8 text-[15px] leading-7 sm:text-base sm:leading-8">
        {hasSession ? (
          <Link
            to={POST_LOGIN_REDIRECT}
            className="font-medium text-zinc-950 underline underline-offset-2 hover:opacity-70 dark:text-white"
          >
            Get started
          </Link>
        ) : (
          <button
            type="button"
            onClick={onSignUp}
            className="cursor-pointer font-medium text-zinc-950 underline underline-offset-2 hover:opacity-70 dark:text-white"
          >
            Get started
          </button>
        )}
      </p>
    </BlogPostLayout>
  );
}
