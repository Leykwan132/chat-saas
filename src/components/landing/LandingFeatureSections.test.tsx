import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { FeaturesSection } from './LandingFeatureSections';

test('renders portrait benefit cards before each benefit description', () => {
  const markup = renderToStaticMarkup(<FeaturesSection />);

  expect(markup).toContain('Built for real customer conversations');
  expect(markup).toMatch(
    /answer\.png[^>]*\/><div[^>]*><h3[^>]*>Handle Complex Questions<\/h3><p[^>]*>Give accurate, contextual answers to even your customers’ most detailed questions\.<\/p>/,
  );
  expect(markup).toMatch(
    /custom\.png[^>]*\/><div[^>]*><h3[^>]*>Tailored to Your Business<\/h3><p[^>]*>Train KiloBot on your content and customize how it responds, behaves, and represents your business\.<\/p>/,
  );
  expect(markup).toMatch(
    /booking\.png[^>]*\/><div[^>]*><h3[^>]*>Turn Enquiries Into Bookings<\/h3><p[^>]*>Guide customers naturally from their first question to a confirmed booking, right inside the conversation\.<\/p>/,
  );
});
