import { afterEach, expect, test } from "vitest";
import type { Doc } from "../_generated/dataModel";
import { requireReadyMediaPublicUrl } from "./publicUrls";

const originalBaseUrl = process.env.MEDIA_CDN_BASE_URL;

afterEach(() => {
  if (originalBaseUrl === undefined) {
    delete process.env.MEDIA_CDN_BASE_URL;
  } else {
    process.env.MEDIA_CDN_BASE_URL = originalBaseUrl;
  }
});

test("derives ready media public URL from r2 key", () => {
  process.env.MEDIA_CDN_BASE_URL = "https://cdn.example.com/";

  expect(requireReadyMediaPublicUrl({
    clientId: "video-client-id",
    status: "ready",
    r2Key: "workflow-media/org/agent/node/video.mp4",
  } as Doc<"mediaUploads">)).toBe(
    "https://cdn.example.com/workflow-media/org/agent/node/video.mp4",
  );
});

test("prefers stored ready media public URL", () => {
  process.env.MEDIA_CDN_BASE_URL = "https://cdn.example.com";

  expect(requireReadyMediaPublicUrl({
    clientId: "video-client-id",
    status: "ready",
    r2Key: "workflow-media/org/agent/node/video.mp4",
    publicUrl: "https://media.example.com/video.mp4",
  } as Doc<"mediaUploads">)).toBe("https://media.example.com/video.mp4");
});

test("fails when ready media has no public URL or r2 key", () => {
  expect(() => requireReadyMediaPublicUrl({
    clientId: "video-client-id",
    status: "ready",
  } as Doc<"mediaUploads">)).toThrow(
    "Ready media video-client-id is missing public URL and R2 key",
  );
});
