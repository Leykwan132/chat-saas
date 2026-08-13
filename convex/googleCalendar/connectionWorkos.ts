import { GOOGLE_CALENDAR_PROVIDER } from "./constants";
import { getWorkOSApiKey } from "../workosClient";

const WORKOS_API_BASE = "https://api.workos.com";

export async function createUserScopedPipesWidgetToken(
  workosUserId: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImplementation(`${WORKOS_API_BASE}/widgets/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getWorkOSApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: workosUserId }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text.slice(0, 200) || `WorkOS widget token failed (${response.status})`);
  }
  const payload = JSON.parse(text) as { token?: unknown };
  if (typeof payload.token !== "string" || payload.token.length === 0) {
    throw new Error("WorkOS widget token response was empty.");
  }
  return payload.token;
}

export async function deleteWorkosGoogleCalendarAccount(
  workosUserId: string,
  fetchImplementation: typeof fetch = fetch,
) {
  const response = await fetchImplementation(
    `${WORKOS_API_BASE}/user_management/users/${encodeURIComponent(workosUserId)}/connected_accounts/${GOOGLE_CALENDAR_PROVIDER}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getWorkOSApiKey()}`,
      },
    },
  );
  if (response.ok || response.status === 404) return;
  const text = await response.text();
  throw new Error(text.slice(0, 200) || `WorkOS disconnect failed (${response.status})`);
}
