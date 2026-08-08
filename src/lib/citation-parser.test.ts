import { describe, expect, it } from "vitest";
import {
  parseCitations,
  stripInlineCitationMarkers,
} from "./citation-parser";

describe("parseCitations", () => {
  it("parses unnumbered JSON-like citation objects from the Citations section", () => {
    const parsed = parseCitations(`Yes, we have a Business plan. [1]

Citations

{title: "Pricing Plan for Kilobot", url: "https://storage.kilobot.app/Pricing%20Plan%20for%20Kilobot_598c22d5.txt", description: "Contains the KiloBot pricing plans."}

{title: "Pricing Plan for Kilobot", url: "https://kilobot.app/pricing", description: "Official KiloBot pricing page."}`);

    expect(parsed.content).toBe("Yes, we have a Business plan.");
    expect(parsed.citations).toEqual([
      {
        number: "1",
        title: "Pricing Plan for Kilobot",
        url: "https://storage.kilobot.app/Pricing%20Plan%20for%20Kilobot_598c22d5.txt",
        description: "Contains the KiloBot pricing plans.",
      },
      {
        number: "2",
        title: "Pricing Plan for Kilobot",
        url: "https://kilobot.app/pricing",
        description: "Official KiloBot pricing page.",
      },
    ]);
  });

  it("parses numbered prose citations and strips inline markers from chat text", () => {
    const parsed = parseCitations(`Business is *RM 899/month* [1].

Yearly plans are about *20% off* [2].

Citations

1. Pricing Plan for Kilobot. (n.d.). *Quick answer*. [https://storage.kilobot.app/Pricing%20Plan.txt](https://storage.kilobot.app/Pricing%20Plan.txt). Description: Contains the full pricing breakdown.

2. Pricing Plan for Kilobot. (n.d.). *Billing rules*. [https://kilobot.app/pricing](https://kilobot.app/pricing). Description: Mentions the yearly discount.`);

    expect(parsed.content).toBe(
      "Business is *RM 899/month*.\n\nYearly plans are about *20% off*.",
    );
    expect(parsed.citations).toEqual([
      {
        number: "1",
        title: "Pricing Plan for Kilobot",
        url: "https://storage.kilobot.app/Pricing%20Plan.txt",
        description: "Contains the full pricing breakdown.",
      },
      {
        number: "2",
        title: "Pricing Plan for Kilobot",
        url: "https://kilobot.app/pricing",
        description: "Mentions the yearly discount.",
      },
    ]);
  });

  it("strips leftover inline citation markers", () => {
    expect(
      stripInlineCitationMarkers("Starter includes 2 agents [1] and all channels [2]."),
    ).toBe("Starter includes 2 agents and all channels.");
  });
});
