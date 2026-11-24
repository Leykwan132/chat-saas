export function partnerPwaManifest(branding: {
  partnerName: string;
  logoUrl: string | null;
}) {
  return {
    id: "/workspace",
    name: branding.partnerName,
    short_name: branding.partnerName,
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    theme_color: "#ffffff",
    background_color: "#ffffff",
    icons: branding.logoUrl ? [{ src: branding.logoUrl, purpose: "any" }] : [],
  };
}
