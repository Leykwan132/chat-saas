import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { WorkflowSendMediaTitle } from './WorkflowSendMediaTitle';

test('marks files and photos/videos as required', () => {
  const fileMarkup = renderToStaticMarkup(
    <WorkflowSendMediaTitle title="Files to send" />,
  );
  const imageMarkup = renderToStaticMarkup(
    <WorkflowSendMediaTitle title="Your Photos/Videos" />,
  );

  expect(fileMarkup).toContain('Files to send');
  expect(fileMarkup).toContain(' required</span>');
  expect(imageMarkup).toContain('Your Photos/Videos');
  expect(imageMarkup).toContain(' required</span>');
});
