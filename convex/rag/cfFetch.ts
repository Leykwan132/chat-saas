"use node";

import Cloudflare from "cloudflare";
import { isCloudflareNotFoundError } from "../cloudflare";

const cfAccountId = process.env.CF_ACCOUNT_ID!;
const cfInstanceName = process.env.CF_AI_SEARCH_NAME!;
const cfNamespace = process.env.CF_AI_SEARCH_NAMESPACE ?? "default";

const client = new Cloudflare({
  apiToken: process.env.CF_AI_SEARCH_TOKEN!,
});

export async function downloadCfItemBytes(cfItemId: string): Promise<ArrayBuffer | null> {
  try {
    const response = await client.aiSearch.namespaces.instances.items.download(
      cfNamespace,
      cfInstanceName,
      cfItemId,
      { account_id: cfAccountId },
    );
    return await response.arrayBuffer();
  } catch (error) {
    if (isCloudflareNotFoundError(error)) return null;
    throw error;
  }
}

export async function readCfItemChunksText(cfItemId: string): Promise<string | null> {
  try {
    const parts: string[] = [];
    let offset = 0;
    for (;;) {
      const page = await client.aiSearch.namespaces.instances.items.chunks(
        cfNamespace,
        cfInstanceName,
        cfItemId,
        { account_id: cfAccountId, limit: 100, offset },
      );
      if (page.length === 0) break;
      for (const chunk of page) {
        if (chunk.text.trim()) parts.push(chunk.text.trim());
      }
      if (page.length < 100) break;
      offset += page.length;
    }
    const text = parts.join("\n\n").trim();
    return text || null;
  } catch (error) {
    if (isCloudflareNotFoundError(error)) return null;
    throw error;
  }
}
