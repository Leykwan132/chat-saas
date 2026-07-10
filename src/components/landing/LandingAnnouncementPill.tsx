import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { ShineBorder } from '@/components/ui/shine-border';
import { ACTIVE_BLOG_HEADLINE } from '@/content/blog/activeHeadline';

export function LandingAnnouncementPill() {
  const { beforeLogo, afterLogo, logoUrl, logoAlt, slug } = ACTIVE_BLOG_HEADLINE;

  return (
    <Link
      to={`/blog/${slug}`}
      className="group relative mb-6 inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-full border border-zinc-200/80 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 sm:mb-8 sm:gap-2 sm:px-4 sm:py-2 sm:text-base dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
    >
      <ShineBorder
        borderWidth={1.5}
        duration={10}
        shineColor={['#A07CFE', '#FE8FB5', '#FFBE7B']}
      />
      <span className="relative z-10 min-w-0 truncate">
        {beforeLogo ? `${beforeLogo} ` : null}
        <img
          src={logoUrl}
          alt={logoAlt}
          className="mr-1 inline-block size-3 shrink-0 align-[-0.1em] object-contain sm:mr-1.5 sm:size-3.5"
        />
        {afterLogo}
      </span>
      <ArrowRight className="relative z-10 size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
