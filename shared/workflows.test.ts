import { expect, test } from "vitest";
import { workflowNodeDefaultCondition } from "./workflows";

test("book appointment defaults to a Yes condition", () => {
  expect(workflowNodeDefaultCondition("bookAppointment")).toMatchObject({
    label: "Yes",
    detail: expect.stringContaining("customer wants to book one of the selected services"),
  });
});
