import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { WhatsAppConnectionRequiredState } from './WhatsAppFeatureGate';

function renderConnectionRequiredState(variant: 'default' | 'minimal') {
  return renderToStaticMarkup(
    <MemoryRouter>
      <WhatsAppConnectionRequiredState
        agentId="agent-1"
        feature="Broadcast"
        variant={variant}
      />
    </MemoryRouter>,
  );
}

test('renders the minimal Broadcast connection prompt', () => {
  const markup = renderConnectionRequiredState('minimal');

  expect(markup).toContain('Connect WhatsApp first');
  expect(markup).toContain('text-[#25D366]');
  expect(markup).toContain('lucide-plus');
  expect(markup).toContain('Connect Channel');
  expect(markup).not.toContain('Open Channels');
  expect(markup).not.toContain('border-[#25D366]/30');
  expect(markup).not.toContain('bg-[#25D366]/5');
});

test('preserves the default connection prompt for other features', () => {
  const markup = renderConnectionRequiredState('default');

  expect(markup).toContain('Open Channels');
  expect(markup).toContain('border-[#25D366]/30');
  expect(markup).toContain('bg-[#25D366]/5');
  expect(markup).not.toContain('Connect Channel');
});
