import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  GOOGLE_CALENDAR_ICON_SRC,
  GoogleCalendarConnectionCard,
} from "./GoogleCalendarConnectionCard";
import { reconcileUntilGoogleCalendarReady } from "./useGoogleCalendarConnection";
import { GoogleCalendarSourceBadge } from "./GoogleCalendarSourceBadge";
import { EventDetailsBody } from "./CalendarEventDetailsBody";
import type { AppointmentDetails } from "./CalendarEventDetailsBody";
import { formatPrefixedRelativeAge } from "@/lib/formatRelativeAge";

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
  it("offers a + Google Calendar button with the official Calendar icon", () => {
    const markup = renderConnectionCard({ state: "not_connected" });
    expect(markup).toContain("+ Google Calendar");
    expect(markup).toContain(GOOGLE_CALENDAR_ICON_SRC);
    expect(GOOGLE_CALENDAR_ICON_SRC).toContain("gstatic.com/images/branding/productlogos/calendar_2026_13");
    const source = readFileSync(new URL("./GoogleCalendarConnectionCard.tsx", import.meta.url), "utf8");
    expect(source).toContain("Connect Google Calendar");
    expect(source).toContain("TooltipContent");
  });

  it("shows the connected account in a card with a trash disconnect", () => {
    const createdAt = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const markup = renderConnectionCard({
      state: "connected",
      connectedAccountEmail: "owner@gmail.com",
      createdAt,
    });
    expect(markup).toContain("Google Calendar");
    expect(markup).toContain(GOOGLE_CALENDAR_ICON_SRC);
    expect(markup).toContain("owner@gmail.com");
    expect(markup).not.toContain("Google account");
    expect(markup).toContain("rounded-xl");
    expect(markup).toContain("shadow-none");
    expect(markup).toContain("fill-green-600");
    expect(markup).toContain("text-white");
    expect(markup).toContain('aria-label="Active"');
    expect(markup).toContain(formatPrefixedRelativeAge("Connected", createdAt));
    expect(markup).toContain('aria-label="Disconnect Google Calendar"');
    expect(markup).not.toContain(">Connected<");
    const source = readFileSync(new URL("./GoogleCalendarConnectionCard.tsx", import.meta.url), "utf8");
    expect(source).toContain("formatPrefixedRelativeAge");
    expect(source).toContain("rounded-xl");
    expect(source).toContain("shadow-none");
    expect(source).toContain("fill-green-600");
    expect(source).toContain("text-white");
    expect(source).toContain("BadgeCheck");
    expect(source).not.toContain("CheckCircle2");
    expect(source).not.toContain("rounded-4xl");
    expect(source).toContain("Trash2");
    expect(source).toContain("Disconnect Google Calendar");
    expect(source).not.toContain("DropdownMenu");
    expect(source).not.toContain("ChevronDown");
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
    expect(hook).toContain('console.log("[google-calendar] WorkOS connected-account"');
    expect(hook).not.toContain("waitForPopupClose");
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

  it("places Google Calendar below Assigned to me, not in the header", () => {
    const page = readFileSync(new URL("../../pages/CalendarPage.tsx", import.meta.url), "utf8");
    const sidebar = page.indexOf("googleCalendarConnection=");
    const header = page.indexOf("inboxColumnHeaderClassName, 'justify-between px-4'");
    expect(sidebar).toBeGreaterThan(-1);
    expect(sidebar).toBeLessThan(header);
    expect(page.slice(header)).not.toContain("<GoogleCalendarConnectionCard");
    expect(page).not.toContain(">Today</Button>");
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
