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

const thread = [
  doc({ id: "old-assistant", createdAt: 100, role: "assistant" }),
  doc({ id: "old-tool", createdAt: 110, role: "tool" }),
  doc({ id: "customer", createdAt: 200, role: "user" }),
  doc({ id: "new-assistant", createdAt: 1_100, role: "assistant" }),
  doc({ id: "prompt", createdAt: 1_200, role: "user" }),
];

test("instruction context keeps the full history when instructions never changed", () => {
  const history = instructionContextHistory(thread, undefined, "prompt");

  expect(history.map((message) => message._id)).toEqual([
    "old-assistant",
    "old-tool",
    "customer",
    "new-assistant",
  ]);
});

test("instruction context drops only assistant and tool messages from before the instructions change", () => {
  const history = instructionContextHistory(thread, 1_000, "prompt");

  expect(history.map((message) => message._id)).toEqual([
    "customer",
    "new-assistant",
  ]);
});

test("instruction context keeps an assistant reply written at the instructions change", () => {
  const history = instructionContextHistory(
    [doc({ id: "same-time", createdAt: 1_000, role: "assistant" })],
    1_000,
  );

  expect(history.map((message) => message._id)).toEqual(["same-time"]);
});
