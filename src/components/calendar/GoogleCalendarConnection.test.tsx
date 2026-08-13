import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { CalendarSidebar } from "./CalendarSidebar";
import { GoogleCalendarConnectionCard } from "./GoogleCalendarConnectionCard";
import { GoogleCalendarDisconnectDialog } from "./GoogleCalendarDisconnectDialog";
import { GoogleCalendarPipesDialog } from "./GoogleCalendarPipesDialog";
import { GoogleCalendarSourceBadge } from "./GoogleCalendarSourceBadge";
import { EventDetailsBody } from "./CalendarEventDetailsBody";
import type { AppointmentDetails } from "./CalendarEventDetailsBody";
import type { Id } from "../../../convex/_generated/dataModel";

vi.mock("@workos-inc/widgets", () => ({
  Pipes: () => <div>Pipes widget</div>,
  WorkOsWidgets: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderConnectionCard(
  props: Partial<ComponentProps<typeof GoogleCalendarConnectionCard>> & {
    state: ComponentProps<typeof GoogleCalendarConnectionCard>["state"];
  },
) {
  return renderToStaticMarkup(
    <GoogleCalendarConnectionCard
      pending={false}
      onConnect={() => undefined}
      onReconnect={() => undefined}
      onRefresh={() => undefined}
      onDisconnect={() => undefined}
      {...props}
    />,
  );
}

describe("Google Calendar connection UI", () => {
  it("offers Connect Google Calendar when no connection exists", () => {
    expect(renderConnectionCard({ state: "not_connected" })).toContain("Connect Google Calendar");
  });

  it("shows last sync and Refresh when connected", () => {
    const markup = renderConnectionCard({
      state: "connected",
      lastSuccessfulSyncAt: Date.UTC(2026, 7, 13, 4, 0, 0),
    });
    expect(markup).toContain("Connected");
    expect(markup).toContain("Refresh");
  });

  it("shows reconnect recovery without claiming connected", () => {
    const markup = renderConnectionCard({ state: "needs_reauthorization" });
    expect(markup).toContain("Reconnect required");
    expect(markup).not.toContain(">Connected<");
  });

  it("disables pending actions", () => {
    const markup = renderConnectionCard({ state: "not_connected", pending: true });
    expect(markup).toContain("disabled");
  });

  it("asks for disconnect confirmation", () => {
    const markup = renderToStaticMarkup(
      <GoogleCalendarDisconnectDialog
        open
        pending={false}
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
      />,
    );
    expect(markup).toContain("Disconnect Google Calendar?");
    expect(markup).toContain("Bookings created in Kilobot are kept.");
  });

  it("renders the Pipes dialog", () => {
    const markup = renderToStaticMarkup(
      <GoogleCalendarPipesDialog
        open
        authToken={async () => "token"}
        onOpenChange={() => undefined}
      />,
    );
    expect(markup).toContain("Connect Google Calendar");
    expect(markup).toContain("Pipes widget");
  });

  it("renders Google and Kilobot source badges", () => {
    expect(renderToStaticMarkup(<GoogleCalendarSourceBadge origin="google" />)).toContain("Google");
    expect(renderToStaticMarkup(<GoogleCalendarSourceBadge origin="kilobot" />)).toContain("Kilobot");
    expect(renderToStaticMarkup(<GoogleCalendarSourceBadge />)).toBe("");
  });

  it("shows owner edit and delete on a Google event", () => {
    const details: AppointmentDetails = {
      eventId: "jd7event" as Id<"calendarEvents">,
      title: "Dentist",
      status: "confirmed",
      isAppointmentBooking: false,
      serviceName: "Dentist",
      serviceFields: [],
      collectedFields: {},
      date: "Thu, 13 Aug 2026",
      timeRange: "9:00 AM – 10:00 AM",
      attendeeNames: [],
      externalOrigin: "google",
    };
    const markup = renderToStaticMarkup(
      <EventDetailsBody
        details={details}
        actions={
          <div>
            <button type="button" aria-label="Update event">Edit</button>
            <button type="button" aria-label="Delete event">Delete</button>
          </div>
        }
      />,
    );
    expect(markup).toContain("Google");
    expect(markup).toContain("aria-label=\"Update event\"");
    expect(markup).toContain("aria-label=\"Delete event\"");
  });

  it("keeps teammate Busy details read-only", () => {
    const markup = renderToStaticMarkup(
      <EventDetailsBody
        details={{
          eventId: "jd7busy" as Id<"calendarEvents">,
          title: "Busy",
          status: "confirmed",
          isAppointmentBooking: false,
          serviceName: "Busy",
          serviceFields: [],
          collectedFields: {},
          date: "Thu, 13 Aug 2026",
          timeRange: "9:00 AM – 10:00 AM",
          attendeeNames: [],
        }}
      />,
    );
    expect(markup).toContain("Busy");
    expect(markup).not.toContain("aria-label=\"Update event\"");
    expect(markup).not.toContain("Google");
  });

  it("places the connection card on the Calendar sidebar", () => {
    const markup = renderToStaticMarkup(
      <CalendarSidebar
        assignedToMeOnly={false}
        canManageCalendar
        hasCurrentUser
        selectedDate={new Date(2026, 7, 13)}
        visibleMonth={new Date(2026, 7, 1)}
        onAssignedToMe={() => undefined}
        onChangeMonth={() => undefined}
        onCreateBooking={() => undefined}
        onShowAllEvents={() => undefined}
        connectionCard={
          <GoogleCalendarConnectionCard
            state="not_connected"
            pending={false}
            onConnect={() => undefined}
            onReconnect={() => undefined}
            onRefresh={() => undefined}
            onDisconnect={() => undefined}
          />
        }
      />,
    );
    expect(markup).toContain("Connect Google Calendar");
    expect(markup.indexOf("New Booking")).toBeLessThan(markup.indexOf("Connect Google Calendar"));
  });
});
