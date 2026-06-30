import { expect, test } from "vitest";
import {
  dedupeMediaItems,
  extractSendMediaItemsFromResult,
} from "./mediaToolResults";

test("extracts sendMedia tool outputs without text markers", () => {
  const result = {
    text: "Here are the photos.",
    steps: [
      {
        toolResults: [
          { toolName: "fetchContext", output: [] },
          {
            toolName: "sendMedia",
            output: [
              {
                clientId: "media-1",
                publicUrl: "https://cdn.example.com/one.jpg",
                mediaType: "image/jpeg",
                filename: "one.jpg",
              },
            ],
          },
        ],
      },
    ],
  };

  expect(extractSendMediaItemsFromResult(result)).toEqual([
    {
      url: "https://cdn.example.com/one.jpg",
      mediaType: "image/jpeg",
      filename: "one.jpg",
    },
  ]);
});

test("extracts sendMedia from top-level tool results", () => {
  const result = {
    text: "Here are the photos.",
    toolResults: [
      {
        type: "tool-result",
        toolName: "sendMedia",
        output: [
          {
            publicUrl: "https://cdn.example.com/top-level.mp4",
            mediaType: "video/mp4",
            filename: "top-level.mp4",
          },
        ],
      },
    ],
  };

  expect(extractSendMediaItemsFromResult(result)).toEqual([
    {
      url: "https://cdn.example.com/top-level.mp4",
      mediaType: "video/mp4",
      filename: "top-level.mp4",
    },
  ]);
});

test("extracts sendMedia from response message json outputs", () => {
  const result = {
    text: "Here is the file.",
    response: {
      messages: [
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolName: "sendMedia",
              output: {
                type: "json",
                value: [
                  {
                    publicUrl: "https://cdn.example.com/spec.pdf",
                    mediaType: "application/pdf",
                    filename: "spec.pdf",
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };

  expect(extractSendMediaItemsFromResult(result)).toEqual([
    {
      url: "https://cdn.example.com/spec.pdf",
      mediaType: "application/pdf",
      filename: "spec.pdf",
    },
  ]);
});

test("deduplicates media items by url", () => {
  expect(dedupeMediaItems([
    { url: "https://cdn.example.com/one.jpg", mediaType: "image/jpeg" },
    { url: "https://cdn.example.com/one.jpg", mediaType: "image/jpeg" },
  ])).toEqual([
    { url: "https://cdn.example.com/one.jpg", mediaType: "image/jpeg" },
  ]);
});
