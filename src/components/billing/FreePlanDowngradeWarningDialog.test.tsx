import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { Dialog } from '@/components/ui/dialog';
import { FreePlanDowngradeWarningContent } from './FreePlanDowngradeWarningDialog';

const handlers = {
  onGoBack: () => undefined,
  onContinue: () => undefined,
};

describe('FreePlanDowngradeWarningContent', () => {
  test('separates lost features from team data removal', () => {
    const markup = renderToStaticMarkup(
      <Dialog>
        <FreePlanDowngradeWarningContent
          loading={false}
          {...handlers}
        />
      </Dialog>,
    );

    expect(markup).toContain('Are you sure you want to downgrade?');
    expect(markup).toContain('Free keeps only your Personal workspace.');
    expect(markup).toContain(
      'Everything in your other workspaces will be permanently deleted.',
    );
    expect(markup).toContain('What you’ll lose');
    expect(markup).toContain('What will be removed');
    expect(markup).toContain('Advanced AI models');
    expect(markup).toContain('Only the basic Free model will remain.');
    expect(markup).toContain('AI agents');
    expect(markup).toContain('You can use only one AI agent on Free.');
    expect(markup).toContain('Chats and messages');
    expect(markup).toContain(
      'All conversations in every non-Personal workspace.',
    );
    expect(markup).toContain('Workflows and automations');
    expect(markup).toContain(
      'All remaining non-Personal workspace data will be permanently deleted.',
    );
    expect(markup).toContain('Continue anyway');
    expect(markup).toContain('data-variant="destructive"');
    expect(markup).toContain('text-white');
  });

  test('uses a wider responsive two-column layout', () => {
    const source = readFileSync(
      new URL('./FreePlanDowngradeWarningDialog.tsx', import.meta.url),
      'utf8',
    );

    expect(source).toContain('sm:max-w-2xl');
    expect(source).toContain(
      'grid gap-y-6 md:grid-cols-2 md:gap-x-10',
    );
    expect(source).toContain(
      'max-h-[calc(100svh-2rem)] gap-6 overflow-y-auto',
    );
    expect(source).toContain('overflow-y-auto p-7 sm:max-w-2xl');
    expect(source.match(/className="flex flex-col gap-4"/g)).toHaveLength(2);
    expect(source).not.toContain('sm:max-w-md');
  });
});
