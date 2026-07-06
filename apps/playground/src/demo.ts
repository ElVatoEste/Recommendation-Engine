import { RecommendationEngine } from "../../../packages/engine/src/index.ts";
import type { RecommendationEvent } from "../../../packages/shared/src/index.ts";
import { InMemoryEventStore } from "../../../packages/storage/src/index.ts";

const PRICES: Record<string, number> = {
  bread: 2.5,
  milk: 1.8,
  butter: 4.1,
  cheese: 5.3,
  eggs: 3.2,
  coffee: 7.5,
  sugar: 1.2,
  ham: 4.8,
};

let sequence = 0;

function purchase(
  customerId: string,
  productIds: string[],
  day: number,
): RecommendationEvent {
  sequence += 1;
  return {
    id: `evt-${sequence}`,
    type: "PurchaseCreated",
    orderId: `ord-${sequence}`,
    customerId,
    // Spread across days so trend windows have signal.
    occurredAt: `2026-06-${String(day).padStart(2, "0")}T10:00:00.000Z`,
    items: productIds.map((productId) => ({
      productId,
      quantity: 1,
      unitPrice: PRICES[productId] ?? 1,
    })),
  };
}

function feedback(
  type: "RecommendationAccepted" | "RecommendationIgnored",
  target: string,
  variantId: string,
): RecommendationEvent {
  sequence += 1;
  return {
    id: `evt-${sequence}`,
    type,
    occurredAt: "2026-06-29T12:00:00.000Z",
    recommendationProductId: target,
    sourceProductId: "bread",
    metadata: { experimentId: "default", variantId },
  } as RecommendationEvent;
}

const events: RecommendationEvent[] = [
  purchase("c-1", ["bread", "milk", "eggs"], 2),
  purchase("c-2", ["bread", "milk"], 3),
  purchase("c-3", ["bread", "milk", "butter"], 5),
  purchase("c-4", ["bread", "butter"], 8),
  purchase("c-5", ["bread", "milk", "cheese"], 10),
  purchase("c-6", ["coffee", "sugar"], 12),
  purchase("c-7", ["coffee", "sugar", "milk"], 20),
  purchase("c-8", ["coffee", "milk"], 25),
  purchase("c-9", ["bread", "milk", "ham"], 27),
  purchase("c-10", ["bread", "eggs", "milk"], 29),
  // Recent momentum for coffee/sugar (all late in the window).
  purchase("c-11", ["coffee", "sugar"], 28),
  purchase("c-12", ["coffee", "sugar"], 29),
  // Feedback: the "balanced" variant converts, "collab-heavy" does not.
  feedback("RecommendationAccepted", "milk", "balanced"),
  feedback("RecommendationAccepted", "butter", "balanced"),
  feedback("RecommendationIgnored", "cheese", "collab-heavy"),
];

const engine = new RecommendationEngine(new InMemoryEventStore());

await engine.initialize();

engine.defineExperiment({
  id: "default",
  variants: [
    { id: "balanced", allocation: 1 },
    {
      id: "collab-heavy",
      allocation: 1,
      weights: { popularity: 0.1, association: 0.2, collaborative: 0.6, trend: 0.1 },
    },
  ],
});

for (const event of events) {
  await engine.ingestEvent(event);
}

function section(title: string, value: unknown): void {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(value, null, 2));
}

section("Snapshot", engine.getSnapshot());
section("Popular products", engine.getPopularProducts(3));
section("Co-purchases: bread", engine.getCoPurchases("bread", 3));
section("Associations: bread (feedback-adjusted)", engine.getAssociations("bread", 3));
section("Customer profile: c-8", engine.getCustomerProfile("c-8"));
section("Collaborative recommendations: c-8", engine.getCustomerRecommendations("c-8", 3));
section("Similar products: bread (embeddings)", engine.getSimilarProducts("bread", 3));
section("Embedding recommendations: c-8", engine.getEmbeddingRecommendations("c-8", 3));
section("Trending products", engine.getTrends(3));
section("Hybrid recommendations: c-8", engine.getHybridRecommendations("c-8", 3));
section("Strategy benchmark (leave-one-out)", engine.evaluate(3));
section("A/B experiment report: default", engine.getExperimentReport("default"));

await engine.close();
