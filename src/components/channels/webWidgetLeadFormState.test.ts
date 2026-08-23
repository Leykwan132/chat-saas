import { expect, test } from "vitest";
import type { WebWidgetCustomLeadField } from "../../../shared/webWidgetExperience";
import * as leadFormState from "./webWidgetLeadFormState";

const isCustomLeadFieldReady = (
  leadFormState as {
    isCustomLeadFieldReady?: (field: WebWidgetCustomLeadField) => boolean;
  }
).isCustomLeadFieldReady;

const confirmCustomLeadField = (
  leadFormState as {
    confirmCustomLeadField?: (
      fields: WebWidgetCustomLeadField[],
      field: WebWidgetCustomLeadField,
    ) => WebWidgetCustomLeadField[];
  }
).confirmCustomLeadField;

test("only confirms complete custom visitor fields", () => {
  expect(isCustomLeadFieldReady).toBeTypeOf("function");
  if (isCustomLeadFieldReady === undefined) return;

  expect(
    isCustomLeadFieldReady({
      id: "team_size",
      label: "Team size",
      type: "text",
      options: [],
      required: false,
    }),
  ).toBe(true);
  expect(
    isCustomLeadFieldReady({
      id: "team_size",
      label: "   ",
      type: "text",
      options: [],
      required: false,
    }),
  ).toBe(false);
  expect(
    isCustomLeadFieldReady({
      id: "plan",
      label: "Plan",
      type: "select",
      options: ["Free", "  "],
      required: true,
    }),
  ).toBe(false);
  expect(
    isCustomLeadFieldReady({
      id: "plan",
      label: "Plan",
      type: "select",
      options: ["Free", "Pro"],
      required: true,
    }),
  ).toBe(true);
});

test("only merges a custom field into the saved form when confirmed", () => {
  expect(confirmCustomLeadField).toBeTypeOf("function");
  if (confirmCustomLeadField === undefined) return;

  const savedFields: WebWidgetCustomLeadField[] = [
    {
      id: "company",
      label: "Company",
      type: "text",
      options: [],
      required: true,
    },
  ];
  const draftField: WebWidgetCustomLeadField = {
    id: "plan",
    label: "Plan",
    type: "select",
    options: ["Free", "Pro"],
    required: false,
  };

  expect(savedFields).toEqual([
    {
      id: "company",
      label: "Company",
      type: "text",
      options: [],
      required: true,
    },
  ]);
  expect(confirmCustomLeadField(savedFields, draftField)).toEqual([
    ...savedFields,
    draftField,
  ]);
});
