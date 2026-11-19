import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InboxChatAiControl } from "./InboxChatAiControl";
import type { Id } from "../../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({ useMutation: () => vi.fn() }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));

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
  expect(active).toContain("lucide-play");
  const paused = renderToStaticMarkup(
    <TooltipProvider>
      <InboxChatAiControl
        chat={{ id, handling: "human", aiControlAvailable: true }}
      />
    </TooltipProvider>,
  );
  expect(paused).toContain('aria-label="Resume AI replies"');
  expect(paused).toContain("lucide-pause");
  const unavailable = renderToStaticMarkup(
    <TooltipProvider>
      <InboxChatAiControl
        chat={{ id, handling: "human", aiControlAvailable: false }}
      />
    </TooltipProvider>,
  );
  expect(unavailable).toContain('disabled=""');
});
