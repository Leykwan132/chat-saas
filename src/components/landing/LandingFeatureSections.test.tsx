import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { FeaturesSection } from './LandingFeatureSections';

test('renders portrait benefit cards before each benefit description', () => {
  const markup = renderToStaticMarkup(<FeaturesSection />);

  expect(markup).toContain('Built for real customer conversations');
  expect(markup).toContain('<section class="bg-zinc-100');
  expect(markup).toContain('class="h-auto w-full object-contain"');
  expect(markup).not.toContain('max-w-[320px]');
  expect(markup).toMatch(
    /questions-updated\.png[^>]*\/><div[^>]*><h3[^>]*>Handle Complex Questions<\/h3><p[^>]*>Give accurate, contextual answers to even your customers’ most detailed questions\.<\/p>/,
  );
  expect(markup).toMatch(
    /customs-updated\.png[^>]*\/><div[^>]*><h3[^>]*>Tailored to Your Business<\/h3><p[^>]*>Train KiloBot on your content and customize how it responds, behaves, and represents your business\.<\/p>/,
  );
  expect(markup).toMatch(
    /booking-updated\.png[^>]*\/><div[^>]*><h3[^>]*>Turn Enquiries Into Bookings<\/h3><p[^>]*>Let KiloBot book customers for you, then handle confirmations, updates, and cancellations in the conversation\.<\/p>/,
  );
});
