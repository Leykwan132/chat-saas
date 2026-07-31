import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { Dialog } from '@/components/ui/dialog';
import {
  WhatsAppConnectingAction,
  WhatsAppConnectionErrorContent,
} from './WhatsAppConnectionFeedback';

test('active WhatsApp connection shows a compact square stop action', () => {
  const markup = renderToStaticMarkup(
    <WhatsAppConnectingAction stopping={false} onStop={() => undefined} />,
  );

  expect(markup).toContain('Connecting…');
  expect(markup).toContain('aria-label="Stop WhatsApp connection"');
  expect(markup).toContain('data-size="icon-xs"');
  expect(markup).toContain('lucide-square');
  expect(markup).not.toContain('>Stop</button>');
  expect(markup).toContain('data-variant="destructive"');
  expect(markup).toContain('bg-destructive text-destructive-foreground');
});

test('stopping WhatsApp connection disables the stop action', () => {
  const markup = renderToStaticMarkup(
    <WhatsAppConnectingAction stopping onStop={() => undefined} />,
  );

  expect(markup).toContain('Stopping…');
  expect(markup).toContain('aria-label="Stopping WhatsApp connection"');
  expect(markup).toContain('disabled=""');
  expect(markup).not.toContain('lucide-square');
});

test('WhatsApp connection failure offers only contact support', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <Dialog>
        <WhatsAppConnectionErrorContent message="Meta rejected the code." />
      </Dialog>
    </MemoryRouter>,
  );

  expect(markup).toContain('Connection failed');
  expect(markup).toContain('Meta rejected the code.');
  expect(markup).toContain('href="/contact?intent=support"');
  expect(markup).toContain('Contact support');
  expect(markup).not.toContain('Try again');
  expect(markup).not.toContain('>Close<');
});
