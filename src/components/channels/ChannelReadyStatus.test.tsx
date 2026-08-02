import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import {
  ChannelReadyStatus,
  SavedConversationStatus,
} from './ChannelReadyStatus';

test('renders the shared emerald ready check with its label', () => {
  const markup = renderToStaticMarkup(<ChannelReadyStatus label="Ready" />);

  expect(markup).toContain('bg-emerald-800');
  expect(markup).toContain('text-emerald-100');
  expect(markup).toContain('Ready');
});

test('treats zero saved conversations as a completed connected status', () => {
  const markup = renderToStaticMarkup(
    <SavedConversationStatus conversationCount={0} />,
  );

  expect(markup).toContain('bg-emerald-800');
  expect(markup).toContain('0 conversations saved');
});
