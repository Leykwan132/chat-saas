import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('connected channels show per-platform cards with connect actions instead of a single add placeholder', () => {
  const pageSource = readFileSync(
    new URL('../../pages/ChannelsPage.tsx', import.meta.url),
    'utf8',
  );
  const cardSource = readFileSync(
    new URL('./AvailableChannelCard.tsx', import.meta.url),
    'utf8',
  );

  expect(pageSource).not.toContain('Connect another channel');
  expect(pageSource).not.toContain('Add new channel');
  expect(pageSource).toContain('AvailableChannelCard');
  expect(pageSource).toContain("import { WebsiteChannelCard }");
  expect(pageSource).toContain('<WebsiteChannelCard');
  expect(pageSource).toContain('<div className="hidden" key={service}>');
  expect(pageSource).toContain("const PAUSED_CHANNEL_SERVICES = new Set<SupportedChannelService>([");
  expect(pageSource).toContain("'instagram',");
  expect(pageSource).toContain("'messenger',");
  expect(pageSource).toContain('const shouldHideChannelCard = PAUSED_CHANNEL_SERVICES.has(service);');
  expect(
    pageSource.indexOf('const shouldHideChannelCard = PAUSED_CHANNEL_SERVICES.has(service);'),
  ).toBeLessThan(pageSource.indexOf('const channel = connectedByService.get(service);'));
  expect(pageSource).not.toContain(
    '<div className="hidden">\n            <WebsiteChannelCard',
  );
  expect(pageSource).toContain("'whatsapp'");
  expect(pageSource).toContain("'instagram'");
  expect(pageSource).toContain("'messenger'");
  expect(cardSource).toContain('meta.description');
  expect(cardSource).toContain('justify-end');
  expect(cardSource).toContain('ConnectWhatsAppButton');
  expect(cardSource).toContain('ConnectInstagramButton');
  expect(cardSource).toContain('ConnectMessengerButton');
});
