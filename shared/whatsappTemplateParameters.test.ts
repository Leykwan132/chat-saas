import { describe, expect, test } from "vitest";
import {
  bodyTextNamedParamsForKeys,
  convertAtParametersToNamedPlaceholders,
  extractTemplateParameterKeys,
  findActiveAtTrigger,
  findUnknownTemplateParameters,
} from "./whatsappTemplateParameters";

describe("whatsappTemplateParameters", () => {
  test("converts supported at parameters to named placeholders", () => {
    expect(
      convertAtParametersToNamedPlaceholders(
        "Hi @customer_name, your @booking_service is on @booking_date.",
      ),
    ).toBe("Hi {{customer_name}}, your {{booking_service}} is on {{booking_date}}.");
  });

  test("does not convert email-like at signs", () => {
    expect(convertAtParametersToNamedPlaceholders("email customer_name@example.com")).toBe(
      "email customer_name@example.com",
    );
  });

  test("extracts unique parameters in order from at tokens and placeholders", () => {
    expect(
      extractTemplateParameterKeys(
        "@customer_name {{booking_date}} @customer_name {{booking_time}}",
      ),
    ).toEqual(["customer_name", "booking_date", "booking_time"]);
  });

  test("builds named Meta examples from the registry", () => {
    expect(bodyTextNamedParamsForKeys(["customer_name", "booking_date"])).toEqual([
      { param_name: "customer_name", example: "Jessica Lee" },
      { param_name: "booking_date", example: "July 18 (Saturday)" },
    ]);
  });

  test("reports unknown template parameters", () => {
    expect(findUnknownTemplateParameters("Hi @unknown_value")).toEqual(["unknown_value"]);
  });

  test("finds active at trigger query at the cursor", () => {
    expect(findActiveAtTrigger("Hi @book", 8)).toMatchObject({
      start: 3,
      end: 8,
      query: "book",
    });
  });
});
