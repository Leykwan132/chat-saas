import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

type LegalDocumentProps = {
  sections: LegalSection[];
  className?: string;
};

export function LegalDocument({ sections, className }: LegalDocumentProps) {
  return (
    <article className={cn('space-y-8', className)}>
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24 space-y-3">
          <h2 className="text-xl font-medium text-zinc-900 dark:text-white">{section.title}</h2>
          <div className="legal-body space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-700 dark:[&_a]:text-blue-400 dark:hover:[&_a]:text-blue-300 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
            {section.body}
          </div>
        </section>
      ))}
    </article>
  );
}
