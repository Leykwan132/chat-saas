type GoogleTag = (
  command: 'event',
  eventName: 'conversion',
  parameters: {
    send_to: string;
    event_callback: () => void;
  },
) => void;

declare global {
  interface Window {
    gtag: GoogleTag;
  }
}

const SIGNUP_CONVERSION = 'AW-17745887902/e7XFCmGnOMcEJ6F841C';

export function reportGoogleAdsConversion(onConversionReported: () => void) {
  window.gtag('event', 'conversion', {
    send_to: SIGNUP_CONVERSION,
    event_callback: onConversionReported,
  });
}
