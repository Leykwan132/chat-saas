const DEFAULT_GRAPH_VERSION = "v22.0";

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
}

export async function fetchWhatsAppMediaAsBase64(
  mediaId: string,
  accessToken: string,
): Promise<{ url: string; mimeType: string }> {
  const metaRes = await fetch(
    `https://graph.facebook.com/${graphVersion()}/${mediaId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metaRes.ok) {
    throw new Error(`Failed to fetch WhatsApp media metadata: HTTP ${metaRes.status}`);
  }
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) {
    throw new Error("WhatsApp media metadata missing url");
  }
  return fetchAudioAsBase64(meta.url, accessToken, meta.mime_type ?? "application/octet-stream");
}

export async function fetchAudioAsBase64(
  url: string,
  accessToken?: string,
  fallbackMimeType = "audio/ogg",
): Promise<{ url: string; mimeType: string }> {
  try {
    let fetchUrl = url;
    if (accessToken && !url.includes("access_token")) {
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set("access_token", accessToken);
      fetchUrl = parsedUrl.toString();
    }
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch audio: HTTP ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    
    let mimeType = res.headers.get("content-type") || fallbackMimeType;
    
    // Normalize audio/opus (not supported by OpenRouter) to audio/ogg (supported, containing opus codecs)
    if (mimeType.includes("audio/opus") || mimeType === "audio/opus") {
      mimeType = "audio/ogg";
    }
    
    return {
      url: `data:${mimeType};base64,${base64}`,
      mimeType,
    };
  } catch (err) {
    console.error("[fetchAudioAsBase64] failed, falling back to original URL:", err);
    return {
      url,
      mimeType: fallbackMimeType,
    };
  }
}
