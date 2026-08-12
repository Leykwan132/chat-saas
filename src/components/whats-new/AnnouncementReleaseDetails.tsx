import { Archive, Sparkles } from 'lucide-react';
import type { Announcement } from '@/components/whats-new/announcements';
import { Badge } from '@/components/ui/badge';

type AnnouncementReleaseDetailsProps = {
  announcement: Announcement;
};

export function AnnouncementReleaseDetails({
  announcement,
}: AnnouncementReleaseDetailsProps) {
  return (
    <div className="flex flex-col gap-3 pl-8">
      <section className="relative overflow-hidden rounded-xl border bg-muted/40 p-4">
        <div className="absolute -top-8 -right-8 size-24 rounded-full bg-foreground/5" />
        <div className="relative flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-background">
              <Sparkles className="size-3.5" />
            </span>
            {announcement.spotlight.eyebrow}
          </div>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div className="flex max-w-md flex-col gap-1">
              <h3 className="text-base font-semibold">
                {announcement.spotlight.title}
              </h3>
              <p className="text-sm leading-5 text-muted-foreground">
                {announcement.spotlight.description}
              </p>
            </div>
            <Badge className="shrink-0 rounded-full px-3 py-1">
              {announcement.spotlight.value}
            </Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-3">
        {announcement.modelCards.map((model) => (
          <article
            key={model.title}
            className="flex min-h-32 flex-col justify-between gap-4 rounded-xl border bg-background p-3.5"
          >
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-medium leading-5">{model.title}</h4>
              <p className="text-xs leading-4 text-muted-foreground">
                {model.description}
              </p>
            </div>
            <span className="text-xs font-medium">{model.value}</span>
          </article>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-background">
          <Archive className="size-3.5 text-muted-foreground" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{announcement.retirement.label}</span>
          <span className="text-xs leading-4 text-muted-foreground">
            {announcement.retirement.description}
          </span>
        </div>
      </div>
    </div>
  );
}
