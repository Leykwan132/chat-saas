export const DEFAULT_DOCUMENT_TITLE = "Kilobot | AI Agent for Every Inbox";

export function resolveHostDocumentTitle(branding: {
  pageTitle: string | null;
  partnerName: string;
} | null | undefined) {
  if (!branding) return DEFAULT_DOCUMENT_TITLE;
  const customTitle = branding.pageTitle?.trim();
  return customTitle || branding.partnerName;
}

export function applyDocumentTitle(title: string) {
  document.title = title;
}
