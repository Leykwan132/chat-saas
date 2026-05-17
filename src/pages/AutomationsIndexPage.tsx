import { Link, useParams } from 'react-router';
import { ChevronRight, Megaphone, MessageCircleReply } from 'lucide-react';

const automations = [
  {
    id: 'broadcast',
    to: 'broadcast',
    title: 'Broadcast',
    description:
      'Send an approved WhatsApp template to many customers who have chatted with your connected number.',
    icon: Megaphone,
  },
  {
    id: 'follow-up',
    to: 'follow-up',
    title: 'Follow up',
    description:
      'Automated follow-ups after a conversation goes quiet—configure timing and messages here soon.',
    icon: MessageCircleReply,
  },
] as const;

export default function AutomationsIndexPage() {
  const { agentId } = useParams();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <header className="border-b border-border pb-6">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-foreground">
          Automations
        </h1>
        <p className="m-0 mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Choose an automation to configure. Broadcast sends WhatsApp template
          messages to your audience; Follow up will support scheduled nudges in
          a future release.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {automations.map(({ id, to, title, description, icon: Icon }) => (
          <Link
            key={id}
            to={`/dashboard/${agentId}/automations/${to}`}
            className="group flex flex-col rounded-xl border border-border bg-card p-6 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            <span className="mt-4 text-sm font-medium text-primary">
              Configure
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
