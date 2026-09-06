import { expect, test } from "vitest";
import {
  BOOKING_NOT_COMPLETED_MESSAGE,
  inventedBookingConfirmation,
  resolveBookingReply,
} from "./bookingReplyGate";

test("replaces model-written booking text with the verified canonical confirmation", () => {
  expect(
    resolveBookingReply({
      generatedMessages: ["Your appointment is booked!"],
      confirmationMessage: "Your appointment is confirmed for Monday at 2:00 PM.",
      bookingExists: true,
      hadBookingBefore: false,
    }),
  ).toEqual(["Your appointment is confirmed for Monday at 2:00 PM."]);
});

test("replaces invented email confirmation copy even when a booking already existed", () => {
  expect(
    resolveBookingReply({
      generatedMessages: [
        "Great! Your Kilobot Demo Session is now booked. I've sent the confirmation link to leykwan132@gmail.com. Check your inbox.",
      ],
      confirmationMessage: "Your booking is confirmed!",
      bookingExists: true,
      hadBookingBefore: true,
    }),
  ).toEqual(["Your booking is confirmed!"]);
});

test("keeps ordinary replies when booking verification finds no booking", () => {
  expect(
    resolveBookingReply({
      generatedMessages: ["That slot is no longer available. What other time works for you?"],
      bookingExists: false,
      hadBookingBefore: false,
    }),
  ).toEqual(["That slot is no longer available. What other time works for you?"]);
});

test("replaces invented confirmation email copy when no booking exists", () => {
  expect(
    resolveBookingReply({
      generatedMessages: [
        "I've sent the confirmation link to leykwan132@gmail.com. Check your inbox and spam folder.",
      ],
      bookingExists: false,
      hadBookingBefore: false,
    }),
  ).toEqual([BOOKING_NOT_COMPLETED_MESSAGE]);
});

test("keeps ordinary replies when no booking finalization was attempted", () => {
  expect(
    resolveBookingReply({
      generatedMessages: ["What time works for you?"],
      bookingExists: false,
      hadBookingBefore: false,
    }),
  ).toEqual(["What time works for you?"]);
});

test("detects invented confirmation-link copy", () => {
  expect(
    inventedBookingConfirmation(
      "Great! Your Kilobot Demo Session is now booked for Thursday. I've sent the confirmation link to leykwan132@gmail.com.",
    ),
  ).toBe(true);
  expect(inventedBookingConfirmation("What time works for you?")).toBe(false);
});
