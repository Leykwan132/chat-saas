import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InboxChatAiControl } from "./InboxChatAiControl";
import type { Id } from "../../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({ useMutation: () => vi.fn() }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));
afterEach(() => {
  vi.useRealTimers();
});

test("scheduled resume replaces the robot and badge with a centered countdown ring", () => {
  vi.useFakeTimers();
  vi.setSystemTime(30_000);
  const markup = renderToStaticMarkup(
    <TooltipProvider>
      <InboxChatAiControl
        chat={{
          id: "chat" as Id<"conversations">,
          handling: "human",
          aiControlAvailable: true,
          aiResumeStartedAt: 0,
          aiResumeAt: 60_000,
        }}
      />
    </TooltipProvider>,
  );
  expect(markup).toContain(">30s<");
  expect(markup).toContain('stroke-dashoffset="-50"');
  expect(markup).not.toContain("lucide-clock");
  expect(markup).not.toContain("-bottom-0.5");
  expect(markup).not.toContain("mt-0.5");
});

test("active and paused controls describe the opposite action", () => {
  const id = "conversation" as Id<"conversations">;
  const active = renderToStaticMarkup(
    <TooltipProvider>
      <InboxChatAiControl
        chat={{ id, handling: "ai", aiControlAvailable: true }}
      />
    </TooltipProvider>,
  );
  expect(active).toContain('aria-label="Pause AI replies"');
  expect(active).toContain("lucide-pause");
  const paused = renderToStaticMarkup(
    <TooltipProvider>
      <InboxChatAiControl
        chat={{ id, handling: "human", aiControlAvailable: true }}
      />
    </TooltipProvider>,
  );
  expect(paused).toContain('aria-label="Resume AI replies"');
  expect(paused).toContain("lucide-play");
  const unavailable = renderToStaticMarkup(
    <TooltipProvider>
      <InboxChatAiControl
        chat={{ id, handling: "human", aiControlAvailable: false }}
      />
    </TooltipProvider>,
  );
  expect(unavailable).toContain('disabled=""');
});
