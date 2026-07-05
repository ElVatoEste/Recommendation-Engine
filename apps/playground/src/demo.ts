import { RecommendationEngine } from "../../../packages/engine/src/index.ts";
import type { RecommendationEvent } from "../../../packages/shared/src/index.ts";
import { InMemoryEventStore } from "../../../packages/storage/src/index.ts";

const engine = new RecommendationEngine(new InMemoryEventStore());

const events: RecommendationEvent[] = [
  {
    id: "evt-1",
    type: "PurchaseCreated",
    orderId: "ord-1001",
    customerId: "customer-1",
    occurredAt: "2026-07-04T10:00:00.000Z",
    items: [
      { productId: "bread", quantity: 1, unitPrice: 2.5 },
      { productId: "milk", quantity: 2, unitPrice: 1.8 },
      { productId: "eggs", quantity: 1, unitPrice: 3.2 },
    ],
  },
  {
    id: "evt-2",
    type: "PurchaseCreated",
    orderId: "ord-1002",
    customerId: "customer-2",
    occurredAt: "2026-07-04T10:05:00.000Z",
    items: [
      { productId: "bread", quantity: 1, unitPrice: 2.5 },
      { productId: "butter", quantity: 1, unitPrice: 4.1 },
    ],
  },
  {
    id: "evt-3",
    type: "PurchaseCreated",
    orderId: "ord-1003",
    customerId: "customer-3",
    occurredAt: "2026-07-04T10:10:00.000Z",
    items: [
      { productId: "milk", quantity: 1, unitPrice: 1.8 },
      { productId: "bread", quantity: 1, unitPrice: 2.5 },
      { productId: "cheese", quantity: 1, unitPrice: 5.3 },
    ],
  },
  {
    id: "evt-4",
    type: "ProductViewed",
    productId: "bread",
    customerId: "customer-4",
    occurredAt: "2026-07-04T10:11:00.000Z",
  },
];

await engine.initialize();

for (const event of events) {
  await engine.ingestEvent(event);
}

console.log("=== Snapshot ===");
console.log(JSON.stringify(engine.getSnapshot(), null, 2));

console.log("\n=== Popular Products ===");
console.log(JSON.stringify(engine.getPopularProducts(5), null, 2));

console.log("\n=== Co-Purchases: bread ===");
console.log(JSON.stringify(engine.getCoPurchases("bread", 5), null, 2));

console.log("\n=== Associations: bread ===");
console.log(JSON.stringify(engine.getAssociations("bread", 5), null, 2));
