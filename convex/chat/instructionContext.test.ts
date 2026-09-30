import { expect, test } from "vitest";
import {
  instructionContextHistory,
  type InstructionContextDoc,
} from "./instructionContext";

function doc(args: {
  id: string;
  createdAt: number;
  role?: "user" | "assistant" | "tool";
}): InstructionContextDoc {
  return {
    _id: args.id,
    _creationTime: args.createdAt,
    ...(args.role === undefined ? {} : { message: { role: args.role } }),
  };
}

test("instruction context sends only customer messages from history", () => {
  const history = instructionContextHistory(
    [
      doc({ id: "old-assistant", createdAt: 100, role: "assistant" }),
      doc({ id: "old-tool", createdAt: 110, role: "tool" }),
      doc({ id: "customer", createdAt: 200, role: "user" }),
      doc({ id: "new-assistant", createdAt: 1_100, role: "assistant" }),
      doc({ id: "prompt", createdAt: 1_200, role: "user" }),
    ],
    1_000,
    "prompt",
  );

  expect(history.map((message) => message._id)).toEqual(["customer"]);
});

test("instruction context drops assistant replies regardless of timestamp", () => {
  const history = instructionContextHistory(
    [doc({ id: "same-time", createdAt: 1_000, role: "assistant" })],
    1_000,
  );

  expect(history.map((message) => message._id)).toEqual([]);
});
