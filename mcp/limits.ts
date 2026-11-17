import { DurableObject } from "cloudflare:workers";
import { consumeWindow, type RateWindow } from "./rateWindow";

export class ConsentRateLimiter extends DurableObject {
  async consume(maximum: number) {
    if (maximum !== 30 && maximum !== 120)
      throw new Error("Invalid rate limit");
    return this.ctx.storage.transaction(async (storage) => {
      const previous = await storage.get<RateWindow>("window");
      const result = consumeWindow(previous, Date.now(), maximum);
      await storage.put("window", result.window);
      await storage.setAlarm(result.window.startedAt + 120000);
      return {
        allowed: result.allowed,
        retryAfterSeconds: result.retryAfterSeconds,
      };
    });
  }
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
