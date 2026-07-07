import { expect, test } from "vitest";
import { extractMediaFromText, stripMediaMarkers } from "./mediaUrlExtractor";

test("extracts title-case media client markers with whitespace", () => {
  const result = extractMediaFromText(`Sure, here you go! 😊

[Media: 750cfb2b-5c10-402f-9a9f-1da14f7998ad]

Would you like to book a showroom viewing to see it in person? 🏡`);

  expect(result).toEqual({
    text: `Sure, here you go! 😊

Would you like to book a showroom viewing to see it in person? 🏡`,
    mediaUrls: [],
    mediaClientIds: ["750cfb2b-5c10-402f-9a9f-1da14f7998ad"],
  });
});

test("strips media markers regardless of label casing", () => {
  expect(stripMediaMarkers("A [media:abc] B [MEDIA: def] C")).toBe("A  B  C");
});
