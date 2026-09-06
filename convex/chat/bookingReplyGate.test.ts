import { expect, test } from "vitest";
import { bookingReplyMessages } from "./bookingReplyGate";

test("replaces model-written booking text with the verified canonical confirmation", () => {
  expect(
    bookingReplyMessages(["Your appointment is booked!"], {
      confirmationMessage: "Your appointment is confirmed for Monday at 2:00 PM.",
      shouldSuppress: false,
    }),
  ).toEqual(["Your appointment is confirmed for Monday at 2:00 PM."]);
});

test("does not send a booking reply when booking verification fails", () => {
  expect(
    bookingReplyMessages(["Your appointment is booked!"], {
      shouldSuppress: true,
    }),
  ).toEqual([]);
});

test("keeps ordinary replies when no booking finalization was attempted", () => {
  expect(bookingReplyMessages(["What time works for you?"], { shouldSuppress: false })).toEqual(["What time works for you?"]);
});
