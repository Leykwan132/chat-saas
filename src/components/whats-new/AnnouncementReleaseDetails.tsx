import { CalendarDays } from 'lucide-react';
import type { Announcement } from '@/components/whats-new/announcements';

type AnnouncementReleaseDetailsProps = {
  announcement: Announcement;
};

const announcementDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatAnnouncementDate(publishedAt: string) {
  return announcementDateFormatter.format(
    new Date(`${publishedAt}T00:00:00Z`),
  );
}

export function AnnouncementReleaseDetails({
  announcement,
}: AnnouncementReleaseDetailsProps) {
  return (
    <div
      data-slot="announcement-release"
      className="flex flex-col gap-6 rounded-xl bg-muted/40 p-5"
    >
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold">{announcement.releaseTitle}</h3>
        <p className="text-sm leading-5 text-muted-foreground">
          {announcement.releaseSummary}
        </p>
      </div>

      {announcement.highlights?.length ? (
        <section className="flex flex-col gap-2">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            {announcement.highlights.map((highlight) => (
              <li key={highlight.title} className="leading-5">
                <span className="font-medium">{highlight.title}</span>{' '}
                <span className="text-muted-foreground">
                  {highlight.description}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {announcement.newModels.length ? (
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">New Models</h4>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            {announcement.newModels.map((model) => (
              <li key={model.name} className="leading-5">
                <span className="font-medium">{model.name}</span>{' '}
                <span className="text-muted-foreground">
                  {model.description}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {announcement.retiredModels.length ? (
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">Retired Models</h4>
          <p className="text-sm leading-5 text-muted-foreground">
            {`${announcement.retiredModels.join(' and ')} are no longer available.`}
          </p>
        </section>
      ) : null}

      {announcement.modelCosts.length ? (
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">Cost of Models</h4>
          <dl className="flex flex-col gap-2 text-sm">
            {announcement.modelCosts.map((tier) => (
              <div
                key={tier.cost}
                className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3"
              >
                <dt className="font-medium">{tier.cost}</dt>
                <dd className="leading-5 text-muted-foreground">
                  {tier.models.join(', ')}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <div
        data-slot="announcement-release-date"
        className="flex items-center gap-1.5 border-t pt-4 text-xs text-muted-foreground"
      >
        <CalendarDays className="size-3.5" />
        <time dateTime={announcement.publishedAt}>
          {`Released on ${formatAnnouncementDate(announcement.publishedAt)}`}
        </time>
      </div>
    </div>
  );
}
