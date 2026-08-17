import { beforeEach, expect, test, vi } from 'vitest';
import { reportGoogleAdsConversion } from './googleAdsConversion';

const gtag = vi.fn();

beforeEach(() => {
  vi.stubGlobal('window', { gtag });
  gtag.mockReset();
});

test('reports the new user sign-up conversion and passes through the callback', () => {
  const onConversionReported = vi.fn();

  reportGoogleAdsConversion(onConversionReported);

  expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
    send_to: 'AW-17745887902/e7XFCmGnOMcEJ6F841C',
    event_callback: onConversionReported,
  });
});
