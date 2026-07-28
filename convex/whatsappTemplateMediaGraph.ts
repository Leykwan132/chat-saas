const DEFAULT_GRAPH_VERSION = "v25.0";

function graphBase(): string {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

function graphError(body: unknown) {
  return typeof body === "string" ? body : JSON.stringify(body, null, 2);
}

async function readGraphObject(response: Response, errorPrefix: string) {
  const text = await response.text();
  let body: unknown;
  try {
    body = text.length ? JSON.parse(text) : text;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${errorPrefix}: ${graphError(body)}`);
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(`${errorPrefix}: Meta returned an unexpected response.`);
  }
  return body as Record<string, unknown>;
}

export async function uploadWhatsAppTemplateMedia(
  phoneNumberId: string,
  token: string,
  formData: FormData,
): Promise<string> {
  const response = await fetch(`${graphBase()}/${phoneNumberId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const data = await readGraphObject(
    response,
    "Meta template media upload failed",
  );
  const mediaId = data.id;
  if (typeof mediaId !== "string" || !mediaId.trim()) {
    throw new Error("Meta media upload did not return a media ID.");
  }
  return mediaId;
}

export async function deleteWhatsAppTemplateMedia(
  mediaId: string,
  token: string,
): Promise<void> {
  const response = await fetch(`${graphBase()}/${mediaId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 404) return;
  await readGraphObject(response, "Meta template media cleanup failed");
}
