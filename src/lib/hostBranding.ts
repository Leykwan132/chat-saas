export type HostBrand = { name: string; logoUrl: string | null };

export type HostBranding = {
  partnerName: string;
  logoUrl: string | null;
};

export function isNativeHost(hostname: string) {
  return (
    hostname === 'kilobot.app' ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost')
  );
}

export function hostBrandName(brand: HostBrand | null | undefined) {
  if (brand === undefined) return '';
  return brand === null ? 'Kilobot' : brand.name;
}

export function toHostBrand(
  branding: HostBranding | null | undefined,
): HostBrand | null | undefined {
  if (!branding) return branding;
  return { name: branding.partnerName, logoUrl: branding.logoUrl };
}
