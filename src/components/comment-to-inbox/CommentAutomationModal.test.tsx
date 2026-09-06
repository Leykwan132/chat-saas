import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import { CommentAutomationModal } from './CommentAutomationModal';
import { getCommentAutomationValidationErrors } from './commentAutomationValidation';

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

test('requires a name and send message before saving', () => {
  expect(getCommentAutomationValidationErrors('  ', '')).toEqual({
    name: true,
    privateMessage: true,
  });
  expect(getCommentAutomationValidationErrors('Pricing automation', 'Send the guide')).toEqual({
    name: false,
    privateMessage: false,
  });
});

test('renders keyword chips above the send controls', () => {
  const markup = renderToStaticMarkup(
    <CommentAutomationModal
      channels={[]}
      agentId={'agent-1' as Id<'agents'>}
      open
      onOpenChange={() => undefined}
    />,
  );

  expect(markup).toContain('Reply to comment?');
  expect(markup).toContain('This is what you');
  expect(markup).toContain('matching keyword.');
  expect(markup).toContain('If comment contains');
  expect(markup).toContain('+ Keyword');
  expect(markup).toContain('Send message');
  expect(markup).toContain('At least one page is needed');
  expect(markup).not.toContain('>Pages</span>');
  expect(markup).not.toContain('Private message');
  expect(markup).not.toContain('Leave empty for any word.');
  expect(markup).not.toContain('Any comment');
  expect(markup).not.toContain('Keywords');
  expect(markup).toContain('Preview');
  expect(markup).toContain('max-h-[95vh]');
  expect(markup).toContain('sm:max-w-6xl');
  expect(markup).toContain('aria-busy="false"');
  expect(markup).toContain('Create automation');
  expect(markup).not.toContain('No public reply will be sent.');
  expect(markup).not.toContain('Your private message will appear here.');
  expect(markup).not.toContain('See what happens when someone comments on your post.');
  expect(markup).not.toContain('Reply publicly');
});

test('renders connected pages as selected cards above the name field', () => {
  const markup = renderToStaticMarkup(
    <CommentAutomationModal
      channels={[
        {
          _id: 'instagram-page' as Id<'channels'>,
          service: 'instagram',
          displayUsername: 'kilobot.instagram',
        },
        {
          _id: 'messenger-page' as Id<'channels'>,
          service: 'messenger',
          displayUsername: 'Kilobot Messenger',
        },
      ]}
      agentId={'agent-1' as Id<'agents'>}
      open
      onOpenChange={() => undefined}
    />,
  );

  expect(markup).toContain('kilobot.instagram');
  expect(markup).toContain('Kilobot Messenger');
  expect(markup).toContain('Instagram');
  expect(markup).toContain('Messenger');
  expect(markup).toContain('text-pink-600');
  expect(markup).toContain('text-blue-600');
  expect(markup).toContain('bg-white');
  expect(markup).toContain('border-emerald-700');
  expect(markup).toContain('border-[3px]');
  expect(markup).toContain('Automation will be live for kilobot.instagram');
  expect(markup).toContain('Automation will be live for Kilobot Messenger');
  expect(markup.indexOf('kilobot.instagram')).toBeLessThan(markup.indexOf('Name'));
  expect(markup.match(/aria-pressed="true"/g)).toHaveLength(2);
  expect(markup.match(/lucide-check/g)).toHaveLength(2);
  expect(markup).not.toContain('self-start');
  expect(markup).not.toContain('ml-auto mt-0.5 size-4');
  expect(markup.match(/\bborder-t\b/g)).toHaveLength(3);
  expect(markup.match(/data-slot="switch"/g)).toHaveLength(1);
});

test('prefills the same form for editing an automation', () => {
  const markup = renderToStaticMarkup(
    <CommentAutomationModal
      automation={{
        _id: 'automation-1' as Id<'commentAutomations'>,
        name: 'Pricing automation',
        trigger: 'keywords',
        keywords: ['pricing'],
        privateMessage: 'Here is the pricing guide.',
        publicReply: 'I sent you the pricing guide.',
      }}
      channels={[{
        _id: 'instagram-page' as Id<'channels'>,
        service: 'instagram',
        displayUsername: 'kilobot.instagram',
      }]}
      agentId={'agent-1' as Id<'agents'>}
      initialChannelIds={['instagram-page' as Id<'channels'>]}
      open
      onOpenChange={() => undefined}
    />,
  );

  expect(markup).toContain('Automation Details');
  expect(markup).not.toContain('Stats');
  expect(markup).not.toContain('data-variant="line"');
  expect(markup).toContain('value="Pricing automation"');
  expect(markup).toContain('pricing');
  expect(markup).toContain('Here is the pricing guide.');
  expect(markup).toContain('I sent you the pricing guide.');
  expect(markup).toContain('Save changes');
  expect(markup).toContain('Delete automation');
  expect(markup).toContain('Delete this automation?');
});

test('shows the edit modal shell immediately while automation details load', () => {
  const markup = renderToStaticMarkup(
    <CommentAutomationModal
      loading
      channels={[]}
      agentId={'agent-1' as Id<'agents'>}
      open
      onOpenChange={() => undefined}
    />,
  );

  expect(markup).toContain('Automation Details');
  expect(markup).toContain('Loading automation details');
  expect(markup).toContain('data-slot="skeleton"');
  expect(markup).not.toContain('If comment contains');
});
