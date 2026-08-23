import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { Dialog } from '@/components/ui/dialog';
import { MessengerPageLoadErrorContent } from './MessengerPagePickerDialog';

test('Page loading failures hide backend details and offer a retry', () => {
  const markup = renderToStaticMarkup(
    <Dialog>
      <MessengerPageLoadErrorContent
        onClose={() => undefined}
        onRetry={() => undefined}
      />
    </Dialog>,
  );

  expect(markup).toContain('Couldn’t load Facebook Pages');
  expect(markup).toContain(
    'We couldn’t load your Facebook Pages. Please try again.',
  );
  expect(markup).toContain('Try again');
  expect(markup).not.toContain('messengerAuth:getPickerPages');
  expect(markup).not.toContain('Server Error Called by client');
});
