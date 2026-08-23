import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { WebWidgetIconUploader } from "./WebWidgetIconUploader";

test("shows a remove-avatar control only for an uploaded avatar", () => {
  const uploadedAvatar = renderToStaticMarkup(
    createElement(WebWidgetIconUploader, {
      canUseCustomIcon: true,
      iconUrl: "https://example.com/avatar.png",
      name: "Kilobot",
      uploading: false,
      onFileSelected: () => undefined,
      onRemove: () => undefined,
    }),
  );
  const defaultAvatar = renderToStaticMarkup(
    createElement(WebWidgetIconUploader, {
      canUseCustomIcon: true,
      name: "Kilobot",
      uploading: false,
      onFileSelected: () => undefined,
      onRemove: () => undefined,
    }),
  );

  expect(uploadedAvatar).toContain('aria-label="Remove avatar"');
  expect(defaultAvatar).not.toContain('aria-label="Remove avatar"');
});
