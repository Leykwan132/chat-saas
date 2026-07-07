import { expect, test } from "vitest";
import { dedupeMediaItems } from "./mediaToolResults";

test("deduplicates media items by url", () => {
  expect(dedupeMediaItems([
    { url: "https://cdn.example.com/one.jpg", mediaType: "image/jpeg" },
    { url: "https://cdn.example.com/one.jpg", mediaType: "image/jpeg" },
    { url: "https://cdn.example.com/two.mp4", mediaType: "video/mp4" },
  ])).toEqual([
    { url: "https://cdn.example.com/one.jpg", mediaType: "image/jpeg" },
    { url: "https://cdn.example.com/two.mp4", mediaType: "video/mp4" },
  ]);
});
