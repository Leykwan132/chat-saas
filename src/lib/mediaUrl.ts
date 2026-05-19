/** Public CDN origin for inbox media (Vite env, no trailing slash). */
export function getPublicMediaUrl(r2Key: string): string {
  const base = (import.meta.env.VITE_MEDIA_CDN_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  );
  if (!base) {
    throw new Error(
      "VITE_MEDIA_CDN_BASE_URL is not set. Configure your R2 custom domain.",
    );
  }
  return `${base}/${r2Key}`;
}
