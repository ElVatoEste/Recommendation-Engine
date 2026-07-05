import { describe, expect, it } from "bun:test";

import type { RecommendationEvent } from "../../shared/src/index.ts";
import { InMemoryEventStore } from "../../storage/src/index.ts";
import { RecommendationEngine } from "./recommendation-engine.ts";

const seedEvents: RecommendationEvent[] = [
  {
    id: "evt-1",
    type: "PurchaseCreated",
    orderId: "ord-1",
    customerId: "customer-1",
    occurredAt: "2026-07-04T10:00:00.000Z",
    items: [
      { productId: "bread", quantity: 1, unitPrice: 2.5 },
      { productId: "milk", quantity: 1, unitPrice: 1.8 },
    ],
  },
  {
    id: "evt-2",
    type: "PurchaseCreated",
    orderId: "ord-2",
    customerId: "customer-2",
    occurredAt: "2026-07-04T10:05:00.000Z",
    items: [
      { productId: "bread", quantity: 1, unitPrice: 2.5 },
      { productId: "milk", quantity: 1, unitPrice: 1.8 },
    ],
  },
  {
    id: "evt-3",
    type: "PurchaseCreated",
    orderId: "ord-3",
    customerId: "customer-3",
    occurredAt: "2026-07-04T10:10:00.000Z",
    items: [
      { productId: "bread", quantity: 1, unitPrice: 2.5 },
      { productId: "butter", quantity: 1, unitPrice: 4.1 },
    ],
  },
  {
    id: "evt-4",
    type: "PurchaseCreated",
    orderId: "ord-4",
    customerId: "customer-4",
    occurredAt: "2026-07-04T10:15:00.000Z",
    items: [{ productId: "milk", quantity: 1, unitPrice: 1.8 }],
  },
  {
    id: "evt-5",
    type: "ProductViewed",
    productId: "bread",
    customerId: "customer-5",
    occurredAt: "2026-07-04T10:16:00.000Z",
  },
];

describe("RecommendationEngine", () => {
  it("ingests generic events and computes popular products, graph edges, and associations", async () => {
    const engine = new RecommendationEngine(new InMemoryEventStore());

    await engine.initialize();

    for (const event of seedEvents) {
      await engine.ingestEvent(event);
    }

    const snapshot = engine.getSnapshot();
    expect(snapshot.totalEvents).toBe(5);
    expect(snapshot.totalPurchases).toBe(4);
    expect(snapshot.uniqueProducts).toBe(3);
    expect(snapshot.productStats[0]?.productId).toBe("bread");
    expect(snapshot.productStats[0]?.purchaseCount).toBe(3);

    const popular = engine.getPopularProducts(2);
    expect(popular).toHaveLength(2);
    expect(popular[0]?.productId).toBe("bread");
    expect(popular[1]?.productId).toBe("milk");

    const graph = engine.getCoPurchases("bread", 5);
    expect(graph).toEqual([
      {
        productId: "bread",
        relatedProductId: "milk",
        coPurchaseCount: 2,
      },
      {
        productId: "bread",
        relatedProductId: "butter",
        coPurchaseCount: 1,
      },
    ]);

    const associations = engine.getAssociations("bread", 5);
    expect(associations[0]?.targetProductId).toBe("butter");
    expect(associations[0]?.coPurchaseCount).toBe(1);
    expect(associations[0]?.support).toBe(0.25);
    expect(associations[0]?.confidence).toBe(0.3333);
    expect(associations[0]?.lift).toBe(1.3333);
  });

  it("replays persisted events from the store on initialize", async () => {
    const store = new InMemoryEventStore(seedEvents.slice(0, 2));
    const engine = new RecommendationEngine(store);

    await engine.initialize();

    const snapshot = engine.getSnapshot();
    expect(snapshot.totalEvents).toBe(2);
    expect(snapshot.totalPurchases).toBe(2);
    expect(snapshot.uniqueProducts).toBe(2);

    await engine.ingestEvent(seedEvents[2]);

    expect(engine.getSnapshot().totalEvents).toBe(3);
    expect(engine.getProductStats("bread")?.purchaseCount).toBe(3);
  });

  it("lets recommendation feedback reorder associations", async () => {
    const engine = new RecommendationEngine(new InMemoryEventStore());

    await engine.initialize();

    for (const event of seedEvents) {
      await engine.ingestEvent(event);
    }

    const before = engine.getAssociations("bread", 5);
    expect(before[0]?.targetProductId).toBe("butter");
    expect(before[0]?.feedbackFactor).toBe(1);
    expect(before[0]?.adjustedScore).toBe(before[0]?.lift);

    // Ignore the bread -> butter recommendation twice: factor drops below 1
    // and butter's adjusted score falls under milk's.
    for (const id of ["fb-1", "fb-2"]) {
      await engine.ingestEvent({
        id,
        type: "RecommendationIgnored",
        occurredAt: "2026-07-04T11:00:00.000Z",
        recommendationProductId: "butter",
        sourceProductId: "bread",
      });
    }

    const after = engine.getAssociations("bread", 5);
    const butter = after.find((item) => item.targetProductId === "butter");

    expect(butter?.feedbackFactor).toBeLessThan(1);
    expect(butter?.adjustedScore).toBeLessThan(butter?.lift ?? 0);
    expect(after[0]?.targetProductId).toBe("milk");

    const stats = engine.getFeedbackStats();
    expect(stats.find((s) => s.targetProductId === "butter")?.ignored).toBe(2);
  });
});
