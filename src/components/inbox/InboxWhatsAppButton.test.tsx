import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { InboxWhatsAppButton, whatsappChatUrl } from "./InboxWhatsAppButton";

test("opens a normalized WhatsApp phone number in a new tab", () => {
  expect(whatsappChatUrl("+60 12-345 6789")).toBe("https://wa.me/60123456789");
  const markup = renderToStaticMarkup(
    <InboxWhatsAppButton phone="+60123456789" />,
  );
  expect(markup).toContain('href="https://wa.me/60123456789"');
  expect(markup).toContain('target="_blank"');
  expect(markup).toContain("Open in WhatsApp");
});

test("does not turn private contact identifiers or missing numbers into links", () => {
  expect(whatsappChatUrl("US.13491208655302741918")).toBeNull();
  expect(whatsappChatUrl(undefined)).toBeNull();
  expect(renderToStaticMarkup(<InboxWhatsAppButton />)).toContain(
    'disabled=""',
  );
});
