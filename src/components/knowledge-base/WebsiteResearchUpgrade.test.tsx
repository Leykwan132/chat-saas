import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { WebsiteResearchUpgrade } from "./WebsiteResearchUpgrade";

vi.mock("@/components/upgradeModalContext", () => ({
  useUpgradeModal: () => ({ openUpgradeModal: () => undefined }),
}));

test("tells free users website research needs a paid plan", () => {
  const markup = renderToStaticMarkup(createElement(WebsiteResearchUpgrade));
  expect(markup).toContain("Website research is on paid plans");
  expect(markup).toContain("Upgrade");
});
