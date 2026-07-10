import { expect, test } from "vitest";
import {
  BROADCAST_MESSAGE_KIND,
  isBroadcastPresentation,
} from "./broadcastMessage";

test("accepts typed broadcast header presentation metadata", () => {
  expect(BROADCAST_MESSAGE_KIND).toBe("broadcast");
  expect(
    isBroadcastPresentation({
      headerAsset: {
        url: "https://cdn.example.com/header.jpg",
        mimeType: "image/jpeg",
        filename: "header.jpg",
        headerFormat: "IMAGE",
      },
    }),
  ).toBe(true);
});

test("rejects unsupported broadcast header formats", () => {
  expect(
    isBroadcastPresentation({
      headerAsset: {
        url: "https://cdn.example.com/header.bin",
        mimeType: "application/octet-stream",
        filename: "header.bin",
        headerFormat: "AUDIO",
      },
    }),
  ).toBe(false);
});
