import type { WidgetInit } from "./protocol";

export function endpoint(
  init: WidgetInit,
  path: string,
  params?: Record<string, string>,
) {
  const url = new URL(path, init.apiBase);
  Object.entries(params ?? {}).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  return url.toString();
}

export async function json<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error("Widget request failed");
  return (await response.json()) as T;
}
