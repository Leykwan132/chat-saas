import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { CalendarSidebar } from "./CalendarSidebar";
import {
  GOOGLE_CALENDAR_ICON_SRC,
  GoogleCalendarConnectionCard,
} from "./GoogleCalendarConnectionCard";
import { GoogleCalendarSourceBadge } from "./GoogleCalendarSourceBadge";
import { EventDetailsBody } from "./CalendarEventDetailsBody";
import type { AppointmentDetails } from "./CalendarEventDetailsBody";
import type { Id } from "../../../convex/_generated/dataModel";

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
  it("offers a simple Connect button with the Google Calendar icon", () => {
    const markup = renderConnectionCard({ state: "not_connected" });
    expect(markup).toContain("Connect");
    expect(markup).toContain(GOOGLE_CALENDAR_ICON_SRC);
    expect(markup).not.toContain("Connect Google Calendar");
  });

  it("shows last sync and Refresh when connected", () => {
    const markup = renderConnectionCard({
      state: "connected",
      lastSuccessfulSyncAt: Date.UTC(2026, 7, 13, 4, 0, 0),
    });
    expect(markup).toContain("Connected");
    expect(markup).toContain("Refresh");
    expect(markup).toContain(GOOGLE_CALENDAR_ICON_SRC);
  });

  it("shows reconnect recovery without claiming connected", () => {
    const markup = renderConnectionCard({ state: "needs_reauthorization" });
    expect(markup).toContain("Reconnect");
    expect(markup).not.toContain(">Connected<");
  });

  it("disables pending actions", () => {
    const markup = renderConnectionCard({ state: "not_connected", pending: true });
    expect(markup).toContain("disabled");
    expect(markup).toContain("Connecting...");
  });

  it("asks for disconnect confirmation", () => {
    const source = readFileSync(new URL("./GoogleCalendarDisconnectDialog.tsx", import.meta.url), "utf8");
    expect(source).toContain("Disconnect Google Calendar?");
    expect(source).toContain("Bookings created in");
    expect(source).toContain("Kilobot are kept.");
  });

  it("connects through a custom authorize URL instead of the hosted Pipes widget", () => {
    const hook = readFileSync(new URL("./useGoogleCalendarConnection.ts", import.meta.url), "utf8");
    const page = readFileSync(new URL("../../pages/CalendarPage.tsx", import.meta.url), "utf8");
    expect(hook).toContain("getCurrentAuthorizeUrl");
    expect(hook).toContain("window.open");
    expect(hook).toContain("window.location.assign");
    expect(hook).not.toContain("getCurrentPipesWidgetToken");
    expect(hook).not.toContain("getAccessToken");
    expect(hook).not.toContain("@workos-inc/widgets");
    expect(page).not.toContain("GoogleCalendarPipesDialog");
    expect(page).not.toContain("@workos-inc/widgets");
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

  it("places the Connect button below Assigned to me", () => {
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
    expect(markup.indexOf("Assigned to me")).toBeLessThan(markup.indexOf(GOOGLE_CALENDAR_ICON_SRC));
    expect(markup.indexOf("Assigned to me")).toBeGreaterThan(markup.indexOf("New Booking"));
    expect(markup).toContain("Connect");
  });
});
