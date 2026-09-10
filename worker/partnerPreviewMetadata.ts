export function buildPartnerPreviewMetadata(input: {
  partnerName: string;
  pageTitle: string | null;
  logoUrl: string | null;
  url: string;
}) {
  return {
    title: input.partnerName,
    siteName: input.partnerName,
    tabTitle: input.pageTitle?.trim() || input.partnerName,
    faviconHref: input.logoUrl,
    url: input.url,
  };
}
