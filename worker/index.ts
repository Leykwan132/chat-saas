import { ConvexHttpClient } from "convex/browser";
import { isNativeHost } from "../src/lib/hostBranding";
import { api } from "../convex/_generated/api";
import { buildPartnerPreviewMetadata } from "./partnerPreviewMetadata";

type Env = {
  ASSETS: Fetcher;
  CONVEX_URL: string;
};

function isHtmlResponse(response: Response) {
  return response.headers.get("content-type")?.includes("text/html") ?? false;
}

function rewritePartnerPreview(response: Response, metadata: {
  title: string;
  siteName: string;
  tabTitle: string;
  faviconHref: string | null;
  url: string;
}) {
  return new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(metadata.tabTitle);
      },
    })
    .on('link[rel="icon"]', {
      element(element) {
        if (metadata.faviconHref === null) {
          element.remove();
          return;
        }
        element.setAttribute("href", metadata.faviconHref);
        element.removeAttribute("type");
      },
    })
    .on('meta[property="og:site_name"]', {
      element(element) {
        element.setAttribute("content", metadata.siteName);
      },
    })
    .on('meta[property="og:title"]', {
      element(element) {
        element.setAttribute("content", metadata.title);
      },
    })
    .on('meta[property="og:url"]', {
      element(element) {
        element.setAttribute("content", metadata.url);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(element) {
        element.setAttribute("content", metadata.title);
      },
    })
    .on('meta[name="description"]', { element: (element) => element.remove() })
    .on('meta[property="og:description"]', { element: (element) => element.remove() })
    .on('meta[property="og:image"]', { element: (element) => element.remove() })
    .on('meta[name="twitter:card"]', { element: (element) => element.remove() })
    .on('meta[name="twitter:description"]', { element: (element) => element.remove() })
    .on('meta[name="twitter:image"]', { element: (element) => element.remove() })
    .transform(response);
}

export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);
    const hostname = new URL(request.url).hostname;
    if (isNativeHost(hostname) || !isHtmlResponse(assetResponse)) {
      return assetResponse;
    }

    const branding = await new ConvexHttpClient(env.CONVEX_URL).query(
      api.whiteLabel.partnerAuthGateway.getBrandingForHostname,
      { hostname },
    );
    if (branding === null) return assetResponse;

    return rewritePartnerPreview(
      assetResponse,
      buildPartnerPreviewMetadata({
        partnerName: branding.partnerName,
        pageTitle: branding.pageTitle,
        logoUrl: branding.logoUrl,
        url: request.url,
      }),
    );
  },
} satisfies ExportedHandler<Env>;
