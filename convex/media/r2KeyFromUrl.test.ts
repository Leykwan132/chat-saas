import { afterEach, expect, test } from "vitest";
import { getR2KeyFromPublicMediaUrl } from "./r2";

const originalBaseUrl = process.env.MEDIA_CDN_BASE_URL;

afterEach(() => {
  process.env.MEDIA_CDN_BASE_URL = originalBaseUrl;
});

test("resolves only media URLs owned by the configured R2 domain", () => {
  process.env.MEDIA_CDN_BASE_URL = "https://media.example.com";
  expect(
    getR2KeyFromPublicMediaUrl(
      "https://media.example.com/inbox/org/image/photo.jpg",
    ),
  ).toBe("inbox/org/image/photo.jpg");
  expect(
    getR2KeyFromPublicMediaUrl("https://graph.facebook.com/media.jpg"),
  ).toBeUndefined();
});
