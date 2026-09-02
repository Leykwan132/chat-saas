import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import * as customerCredentialsDialog from "./PartnerCustomerCredentialsDialog";
import type { CustomerCredentials } from "./PartnerCustomerCredentialsDialog";

type LoadingCredentialsContentProps = {
  credentials: CustomerCredentials | null;
  isLoading: boolean;
};

test("shows a loading placeholder before customer credentials arrive", () => {
  const LoadingCredentialsContent = (
    customerCredentialsDialog as typeof customerCredentialsDialog & {
      CustomerCredentialsContent?: ComponentType<LoadingCredentialsContentProps>;
    }
  ).CustomerCredentialsContent;
  expect(LoadingCredentialsContent).toBeDefined();
  if (!LoadingCredentialsContent) return;
  const markup = renderToStaticMarkup(
    <LoadingCredentialsContent
      credentials={null}
      isLoading
    />,
  );

  expect(markup).toContain("Loading credentials");
  expect(markup).toContain('data-slot="skeleton"');
});
