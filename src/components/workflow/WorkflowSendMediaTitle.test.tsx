import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { WorkflowSendMediaTitle } from './WorkflowSendMediaTitle';

test('marks files to send as required without marking photo and video media', () => {
  const fileMarkup = renderToStaticMarkup(
    <WorkflowSendMediaTitle nodeKind="sendFile" title="Files to send" />,
  );
  const imageMarkup = renderToStaticMarkup(
    <WorkflowSendMediaTitle nodeKind="sendImage" title="Your Photos/Videos" />,
  );

  expect(fileMarkup).toContain('Files to send');
  expect(fileMarkup).toContain(' required</span>');
  expect(imageMarkup).toContain('Your Photos/Videos');
  expect(imageMarkup).not.toContain(' required</span>');
});
