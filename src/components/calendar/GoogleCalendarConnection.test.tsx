import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  GOOGLE_CALENDAR_ICON_SRC,
  GoogleCalendarConnectionCard,
} from "./GoogleCalendarConnectionCard";
import { reconcileUntilGoogleCalendarReady } from "./useGoogleCalendarConnection";
import { GoogleCalendarSourceBadge } from "./GoogleCalendarSourceBadge";
import { EventDetailsBody } from "./CalendarEventDetailsBody";
import type { AppointmentDetails } from "./CalendarEventDetailsBody";

function renderConnectionCard(
  props: Partial<ComponentProps<typeof GoogleCalendarConnectionCard>> & {
    state: ComponentProps<typeof GoogleCalendarConnectionCard>["state"];
  },
) {
  return renderToStaticMarkup(
    <TooltipProvider>
      <GoogleCalendarConnectionCard
        pending={false}
        onConnect={() => undefined}
        onReconnect={() => undefined}
        onDisconnect={() => undefined}
        {...props}
      />
    </TooltipProvider>,
  );
}

describe("Google Calendar connection UI", () => {
  it("shows Google Calendar when no Gmail account is connected", () => {
    const markup = renderConnectionCard({ state: "not_connected" });
    expect(markup).toContain("Google Calendar");
    expect(markup).toContain(GOOGLE_CALENDAR_ICON_SRC);
    expect(markup).not.toContain("+ Connect");
    expect(GOOGLE_CALENDAR_ICON_SRC).toContain("gstatic.com/images/branding/productlogos/calendar_2026_13");
    const source = readFileSync(new URL("./GoogleCalendarConnectionCard.tsx", import.meta.url), "utf8");
    expect(source).toContain("Connect Google Calendar");
    expect(source).toContain("TooltipContent");
  });

  it("shows the Google icon, account email, and one connected check when connected", () => {
    const markup = renderConnectionCard({
      state: "connected",
      connectedAccountEmail: "owner@gmail.com",
    });
    expect(markup).toContain(GOOGLE_CALENDAR_ICON_SRC);
    expect(markup).toContain("owner@gmail.com");
    expect(markup).not.toContain("Google account");
    expect(markup).not.toContain("Connected ");
    expect(markup).toContain('fill="currentColor"');
    expect(markup).toContain('stroke="white"');
    expect(markup).toContain('inline-flex size-5 shrink-0 self-center items-center justify-center leading-none text-green-600');
    expect(markup).toContain('class="block size-full"');
    expect(markup.match(/<svg/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Active"');
    expect(markup).toContain('aria-label="Disconnect Google Calendar"');
    expect(markup).not.toContain(">Connected<");
    const source = readFileSync(new URL("./GoogleCalendarConnectionCard.tsx", import.meta.url), "utf8");
    expect(source).not.toContain('react-icons/hi2');
    expect(source).toContain('hover:bg-muted');
  });

  it("falls back to Google Calendar when the connected email is missing", () => {
    const markup = renderConnectionCard({ state: "connected" });
    expect(markup).toContain("Google Calendar");
    expect(markup).toContain(GOOGLE_CALENDAR_ICON_SRC);
    expect(markup).toContain('text-green-600');
    expect(markup).toContain('stroke="white"');
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
    expect(hook).toContain("reconcileUntilGoogleCalendarReady");
    expect(hook).toContain("requireWorkosAccount");
    expect(hook).not.toContain("console.log");
    expect(hook).not.toContain("waitForPopupClose");
    expect(hook).not.toContain("getCurrentPipesWidgetToken");
    expect(hook).not.toContain("getAccessToken");
    expect(hook).not.toContain("@workos-inc/widgets");
    expect(page).not.toContain("GoogleCalendarPipesDialog");
    expect(page).not.toContain("@workos-inc/widgets");
    expect(page).toContain('useEnableGoogleCalendarConnect');
    expect(page).toContain('isProductFeatureEnabled(googleCalendarConnectState)');
    expect(page).toContain('googleCalendarConnectEnabled && googleCalendar.status');
  });

  it("shows Google source icons and hides local source badges", () => {
    const googleSourceMarkup = renderToStaticMarkup(
      <TooltipProvider>
        <GoogleCalendarSourceBadge origin="google" />
      </TooltipProvider>,
    );
    expect(googleSourceMarkup).toContain(GOOGLE_CALENDAR_ICON_SRC);
    expect(googleSourceMarkup).toContain('aria-label="Event synced with Google Calendar"');
    const source = readFileSync(new URL("./GoogleCalendarSourceBadge.tsx", import.meta.url), "utf8");
    expect(source).toContain("Event synced with Google Calendar");
    expect(renderToStaticMarkup(<GoogleCalendarSourceBadge origin="kilobot" />)).toBe("");
    expect(renderToStaticMarkup(<GoogleCalendarSourceBadge />)).toBe("");
  });

  it("uses a larger Google source icon in event-details headings", () => {
    const headingMarkup = renderToStaticMarkup(
      <TooltipProvider>
        <GoogleCalendarSourceBadge origin="google" size="heading" />
      </TooltipProvider>,
    );
    expect(headingMarkup).toContain('class="size-5"');
    const detailsSource = readFileSync(new URL("./CalendarEventDetailsBody.tsx", import.meta.url), "utf8");
    expect(detailsSource).toContain('<GoogleCalendarSourceBadge origin={details.externalOrigin} size="heading" />');
    expect(detailsSource).toContain("items-center gap-2");
  });

  it("places source indicators before event titles in calendar lists", () => {
    const page = readFileSync(new URL("../../pages/CalendarPage.tsx", import.meta.url), "utf8");
    const eventTitleSource = '<span className="min-w-0 truncate">{event.title}</span>';
    const sourceBadge = "<GoogleCalendarSourceBadge origin={event.externalOrigin} />";
    expect(page.indexOf(sourceBadge)).toBeLessThan(page.indexOf(eventTitleSource));
    expect(page.lastIndexOf(sourceBadge)).toBeLessThan(page.lastIndexOf(eventTitleSource));
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
      <TooltipProvider>
        <EventDetailsBody
          details={details}
          actions={
            <div>
              <button type="button" aria-label="Update event">Edit</button>
              <button type="button" aria-label="Delete event">Delete</button>
            </div>
          }
        />
      </TooltipProvider>,
    );
    expect(markup).toContain(GOOGLE_CALENDAR_ICON_SRC);
    expect(markup.indexOf(`<img src="${GOOGLE_CALENDAR_ICON_SRC}"`)).toBeLessThan(markup.indexOf("Dentist"));
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

  it("places Google Calendar to the left of the timezone control", () => {
    const page = readFileSync(new URL("../../pages/CalendarPage.tsx", import.meta.url), "utf8");
    const header = page.slice(page.indexOf("inboxColumnHeaderClassName, 'justify-between px-4'"));
    expect(header.indexOf("<GoogleCalendarConnectionCard")).toBeLessThan(header.indexOf("<TimeZoneSelect"));
    expect(page).not.toContain("googleCalendarConnection=");
    expect(header.indexOf("{format(visibleMonth, 'MMMM yyyy')}")).toBeLessThan(
      header.indexOf("<Button"),
    );
    expect(header).toContain("Today");
    expect(header).toContain('onClick={() => handleSelectDate(new Date())}');
  });

  it("keeps reconciling while the authorize tab is open", async () => {
    let calls = 0;
    const status = await reconcileUntilGoogleCalendarReady(
      async () => {
        calls += 1;
        return { state: calls < 3 ? "not_connected" : "connected" };
      },
      { pollMs: 0 },
    );
    expect(status.state).toBe("connected");
    expect(calls).toBe(3);
  });

  it("fails loudly if WorkOS still has no account after the prompt", async () => {
    await expect(
      reconcileUntilGoogleCalendarReady(async () => ({ state: "not_connected" }), {
        shouldStop: () => true,
        pollMs: 0,
      }),
    ).rejects.toThrow("Google Calendar is not connected yet.");
  });
});
