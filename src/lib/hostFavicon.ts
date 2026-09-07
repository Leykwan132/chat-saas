export const DEFAULT_DOCUMENT_FAVICON_HREF = "/favicon.ico";

export function resolveHostFaviconHref(logoUrl: string | null | undefined) {
  return logoUrl ? logoUrl : DEFAULT_DOCUMENT_FAVICON_HREF;
}

export function faviconLinkType(href: string) {
  return href === DEFAULT_DOCUMENT_FAVICON_HREF ? "image/svg+xml" : null;
}

export function applyDocumentFavicon(href: string) {
  document.querySelectorAll('link[rel="icon"]').forEach((node) => node.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = href;
  const type = faviconLinkType(href);
  if (type === null) {
    link.removeAttribute("type");
  } else {
    link.type = type;
  }
  document.head.appendChild(link);
}
