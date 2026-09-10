import { expect, test } from "vitest";
import { buildPartnerPreviewMetadata } from "./partnerPreviewMetadata";

test("builds a text-only preview using the partner brand", () => {
  expect(
    buildPartnerPreviewMetadata({
      partnerName: "GOSolutions",
      pageTitle: null,
      logoUrl: null,
      url: "https://chat.gosolutions.sg/",
    }),
  ).toEqual({
    title: "GOSolutions",
    siteName: "GOSolutions",
    tabTitle: "GOSolutions",
    faviconHref: null,
    url: "https://chat.gosolutions.sg/",
  });
});

test("uses the partner tab title and logo in the initial document", () => {
  expect(
    buildPartnerPreviewMetadata({
      partnerName: "GOSolutions",
      pageTitle: "GOSolutions Helpdesk",
      logoUrl: "https://cdn.example/gosolutions.png",
      url: "https://chat.gosolutions.sg/",
    }),
  ).toMatchObject({
    tabTitle: "GOSolutions Helpdesk",
    faviconHref: "https://cdn.example/gosolutions.png",
  });
});
