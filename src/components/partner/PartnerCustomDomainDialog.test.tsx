import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import {
  OwnershipVerifiedDetail,
  SetupStep,
  VerificationCheckingDetail,
} from "./PartnerCustomDomainStep";

test("renders a compact check icon beside the verified ownership message", () => {
  const markup = renderToStaticMarkup(<OwnershipVerifiedDetail />);

  expect(markup).toMatch(
    /data-icon="inline-start"[^>]*>.*Ownership verified\./,
  );
  expect(markup).toContain("size-4");
});

test("sets an expected duration beside verification messages", () => {
  const markup = renderToStaticMarkup(
    <VerificationCheckingDetail message="Checking ownership DNS." />,
  );

  expect(markup).toMatch(
    /data-icon="inline-start"[^>]*>.*Checking ownership DNS\./,
  );
  expect(markup).toContain("Usually takes a few minutes.");
  expect(markup).toContain("DNS propagation can take longer.");
});

test("keeps certificate issuance status to one concise row", () => {
  const markup = renderToStaticMarkup(
    <VerificationCheckingDetail
      message="Waiting for certificate…"
      {...{ brief: true }}
    />,
  );
  const dialogSource = readFileSync(
    new URL("./PartnerCustomDomainDialog.tsx", import.meta.url),
    "utf8",
  );

  expect(markup).toContain("Waiting for certificate…");
  expect(markup).not.toContain("Usually takes a few minutes.");
  expect(dialogSource).toContain(
    '<VerificationCheckingDetail message="Waiting for certificate…" brief />',
  );
});

test("collapses completed setup step details by default", () => {
  const markup = renderToStaticMarkup(
    <SetupStep number={2} status="complete" title="Verify domain ownership">
      <span>Completed step details.</span>
    </SetupStep>,
  );

  expect(markup).toContain("Step 2: Verify domain ownership");
  expect(markup).toContain('aria-expanded="false"');
  expect(markup).not.toContain("Completed step details.");
});
