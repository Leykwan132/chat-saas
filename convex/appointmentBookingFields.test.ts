import { expect, test } from "vitest";
import type { Doc, Id } from "./_generated/dataModel";
import {
  buildBookingConfirmationMessage,
  buildCalendarEventDescription,
  serviceBookingLocation,
} from "./appointmentBooking/fields";

test("uses an address only for in-person services", () => {
  expect(serviceBookingLocation({
    locationMode: "in_person",
    location: "  88 Jalan Ampang, Kuala Lumpur  ",
  })).toBe("88 Jalan Ampang, Kuala Lumpur");
  expect(serviceBookingLocation({
    locationMode: "remote",
    location: "88 Jalan Ampang, Kuala Lumpur",
  })).toBeUndefined();
  expect(serviceBookingLocation({})).toBeUndefined();
});

test("booking confirmation groups details in a readable order", () => {
  const message = buildBookingConfirmationMessage({
    service: {
      name: "Site Visit Sena",
      fields: [
        { key: "date", label: "Booking Date", type: "date" },
        { key: "time", label: "Booking Time", type: "time" },
        { key: "name", label: "Customer Name", type: "text" },
        { key: "phone", label: "Phone Number", type: "phone" },
      ],
      locationMode: "in_person",
      timeZone: "UTC",
    },
    collectedFields: {
      date: "2026-09-07",
      time: "15:00",
      name: "Kwan",
      phone: "0129499394",
    },
    startAt: Date.UTC(2026, 8, 7, 15),
    endAt: Date.UTC(2026, 8, 7, 15, 30),
    assignedTo: "Ley Kwan Choo",
    bookingId: "booking-reference" as Id<"calendarEvents">,
  });

  expect(message).toBe(
    "Your booking is confirmed!\n\n" +
      "Service: Site Visit Sena\n" +
      "Date: September 7 (Monday)\n" +
      "Time: 3:00 PM - 3:30 PM\n\n" +
      "Customer Name: Kwan\n" +
      "Phone Number: 0129499394\n\n" +
      "Team Member: Ley Kwan Choo\n\n" +
      "Booking reference: booking-reference\n\n" +
      "Thank you — we look forward to seeing you!",
  );
});

test("calendar event description includes customer context and interest details", () => {
  const service = {
    _id: "service_1" as Id<"appointmentServices">,
    _creationTime: 0,
    agentId: "agent_1" as Id<"agents">,
    name: "Showroom Viewing",
    description: "Tour available property projects with a consultant.",
    isActive: true,
    sortOrder: 0,
    durationMinutes: 30,
    fields: [
      { key: "date", label: "Booking Date", type: "date" as const },
      { key: "time", label: "Booking Time", type: "time" as const },
      { key: "name", label: "Customer Name", type: "text" as const },
      { key: "phone", label: "Phone Number", type: "phone" as const },
      { key: "property_interest", label: "Property interest", type: "text" as const },
      { key: "budget", label: "Budget", type: "text" as const },
    ],
    timeSlotPolicy: "offer_slots" as const,
    salesStyle: "neutral" as const,
    assignmentStrategy: "balanced" as const,
    createdAt: 0,
    updatedAt: 0,
  } satisfies Doc<"appointmentServices">;
  const customer = {
    _id: "customer_1" as Id<"customers">,
    _creationTime: 0,
    orgId: "",
    service: "whatsapp" as const,
    contactAddress: "+60123456789",
    name: "Kwan",
    phone: "+60123456789",
    tags: ["vip"],
    leadTemperature: "Hot" as const,
    notes: "Prefers family-friendly layouts.",
    source: "whatsapp" as const,
    firstSeenAt: 0,
    lastSeenAt: 0,
    createdAt: 0,
    updatedAt: 0,
  } satisfies Doc<"customers">;
  const conversation = {
    _id: "conversation_1" as Id<"conversations">,
    _creationTime: 0,
    orgId: "",
    service: "whatsapp" as const,
    orgAddress: "business",
    contactAddress: "+60123456789",
    contactName: "Kwan",
    customerId: customer._id,
    status: "open" as const,
    assignedAgentId: service.agentId,
    assignToAiAgent: true,
    threadId: "thread_1",
    lastMessageAt: 0,
    unreadCount: 0,
    createdAt: 0,
    updatedAt: 0,
  } satisfies Doc<"conversations">;

  const description = buildCalendarEventDescription({
    service,
    customer,
    conversation,
    collectedFields: {
      name: "Kwan",
      phone: "+60123456789",
      date: "2026-06-30",
      time: "9:00 AM",
      property_interest: "Sena Residence showroom",
      budget: "RM 800k",
      preferred_unit: "3 bedrooms",
    },
  });

  expect(description).toContain("Customer interest / details shared");
  expect(description).toContain("- Booked interest: Showroom Viewing");
  expect(description).toContain("- Property interest: Sena Residence showroom");
  expect(description).toContain("- Budget: RM 800k");
  expect(description).toContain("- Preferred Unit: 3 bedrooms");
  expect(description).toContain("Customer details");
  expect(description).toContain("- Name: Kwan");
  expect(description).toContain("- Channel: WhatsApp");
  expect(description).toContain("- Lead temperature: Hot");
  expect(description).toContain("- Customer notes: Prefers family-friendly layouts.");
  expect(description).not.toContain("Booking Date");
  expect(description).not.toContain("Booking Time");
});
