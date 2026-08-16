import { useState } from 'react';
import { ArrowRight, BookOpenText, Bug, Mail, MessageCircleQuestionMark } from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { KILOBOT_DOCS_URL } from '@/lib/docsLinks';

const SUPPORT_OPTIONS = [
  {
    title: 'Help center',
    description: 'Find setup guides and answers for every KiloBot feature.',
    action: 'Browse docs',
    href: KILOBOT_DOCS_URL,
    icon: BookOpenText,
    target: undefined,
    rel: undefined,
  },
  {
    title: 'Report a bug',
    description: 'Tell us what went wrong so we can investigate.',
    action: 'Open form',
    href: 'https://forms.gle/Hoo56T7Qj3yEBEeZ9',
    icon: Bug,
    target: '_blank',
    rel: 'noreferrer',
  },
  {
    title: 'WhatsApp support',
    description: 'Chat directly with the Kilobot support team.',
    action: 'Start chat',
    href: 'https://wa.me/60129499394',
    icon: SiWhatsapp,
    target: '_blank',
    rel: 'noreferrer',
  },
  {
    title: 'Email support',
    description: 'Send a detailed question to our support inbox.',
    action: 'Write email',
    href: 'mailto:support@kilobot.app',
    icon: Mail,
    target: undefined,
    rel: undefined,
  },
] as const;

export function SupportHoverCard() {
  const [open, setOpen] = useState(false);

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={100} closeDelay={180}>
      <HoverCardTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 rounded-full px-3 focus-visible:ring-0"
          aria-label="Contact support"
          onClick={() => setOpen(true)}
        >
          <MessageCircleQuestionMark data-icon="inline-start" />
          <span>Need help?</span>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="end"
        className="w-[min(33.6rem,calc(100vw-2rem))] rounded-xl p-3"
      >
        <div className="px-1 pb-3">
          <p className="font-medium">How can we help?</p>
          <p className="text-xs text-muted-foreground">Choose the fastest way to reach us.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SUPPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <a
                key={option.title}
                href={option.href}
                target={option.target}
                rel={option.rel}
                onClick={() => setOpen(false)}
                className="block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <Card
                  size="sm"
                  className="h-full cursor-pointer gap-3 rounded-xl shadow-none transition-colors hover:bg-muted/50"
                >
                  <CardHeader className="gap-3">
                    <Icon className="size-5" aria-hidden />
                    <div className="flex flex-col gap-1">
                      <CardTitle>{option.title}</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {option.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardFooter className="mt-auto justify-end">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary [&_svg]:size-4">
                      {option.action}
                      <ArrowRight data-icon="inline-end" />
                    </span>
                  </CardFooter>
                </Card>
              </a>
            );
          })}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
