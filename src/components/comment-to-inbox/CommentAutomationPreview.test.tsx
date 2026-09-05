import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { CommentAutomationPreview } from './CommentAutomationPreview';

test('highlights the matching keyword and previews both outgoing messages', () => {
  const markup = renderToStaticMarkup(
    <CommentAutomationPreview
      keywordText="pricing"
      privateMessage="Here is the pricing guide."
      publicReply="Thanks for asking!"
    />,
  );

  expect(markup).toContain('<mark');
  expect(markup).toContain('pricing');
  expect(markup).toContain('aspect-[4/3]');
  expect(markup).toContain('min-w-0 max-w-full');
  expect(markup).toContain('break-words');
  expect(markup).toContain('lucide-image');
  expect(markup).not.toContain('src="/icon.svg"');
  expect(markup).not.toContain('Summer drop');
  expect(markup).toContain('Thanks for asking!');
  expect(markup).toContain('max-w-[16rem]');
  expect(markup).toContain('now');
  expect(markup).toContain('ml-8');
  expect(markup).not.toContain('Public reply');
  expect(markup).not.toContain('Hide replies');
  expect(markup).toContain('Message sent to alex.m');
  expect(markup).toContain('Here is the pricing guide.');
});
