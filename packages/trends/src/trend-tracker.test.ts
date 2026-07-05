import { describe, expect, it } from "bun:test";

import type { PurchaseCreatedEvent } from "../../shared/src/index.ts";
import { TrendTracker } from "./trend-tracker.ts";

function purchase(productId: string, occurredAt: string): PurchaseCreatedEvent {
  return {
    id: `${productId}-${occurredAt}`,
    type: "PurchaseCreated",
    orderId: `${productId}-${occurredAt}`,
    occurredAt,
    items: [{ productId, quantity: 1, unitPrice: 1 }],
  };
}

describe("TrendTracker", () => {
  const tracker = new TrendTracker();
  // Latest event is 2026-06-30, so with a 30-day window:
  //   recent  = (2026-05-31, 2026-06-30]
  //   previous = (2026-05-01, 2026-05-31]
  const events = [
    purchase("hot", "2026-05-10T00:00:00.000Z"), // previous (1)
    purchase("hot", "2026-06-10T00:00:00.000Z"), // recent
    purchase("hot", "2026-06-20T00:00:00.000Z"), // recent
    purchase("hot", "2026-06-29T00:00:00.000Z"), // recent (3)
    purchase("cold", "2026-05-05T00:00:00.000Z"), // previous
    purchase("cold", "2026-05-15T00:00:00.000Z"), // previous
    purchase("cold", "2026-05-25T00:00:00.000Z"), // previous (3)
    purchase("cold", "2026-06-15T00:00:00.000Z"), // recent (1)
    purchase("hot", "2026-06-30T00:00:00.000Z"), // sets the latest reference
  ];
  for (const event of events) tracker.registerPurchase(event);

  it("ranks rising products above declining ones", () => {
    const trends = tracker.getTrends();
    const hot = trends.find((t) => t.productId === "hot");
    const cold = trends.find((t) => t.productId === "cold");

    // hot: 4 recent, 1 previous -> growth (4-1)/(1+1) = 1.5
    expect(hot?.recentCount).toBe(4);
    expect(hot?.previousCount).toBe(1);
    expect(hot?.growthRate).toBe(1.5);

    // cold: 1 recent, 3 previous -> growth (1-3)/(3+1) = -0.5
    expect(cold?.growthRate).toBe(-0.5);

    expect(trends[0]?.productId).toBe("hot");
    expect(hot!.trendScore).toBeGreaterThan(cold!.trendScore);
  });

  it("exposes non-negative trend scores for the hybrid signal", () => {
    const scores = tracker.getTrendScores();
    expect(scores.get("hot")).toBeGreaterThan(0);
    expect(scores.get("cold")! >= 0).toBe(true);
  });
});
