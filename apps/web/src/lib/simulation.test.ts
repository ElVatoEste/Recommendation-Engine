import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { RecommendationEvent } from "./contracts";
import { buildSimulationSteps } from "./simulation";

const events: RecommendationEvent[] = [
  {
    id: "evt-1",
    type: "PurchaseCreated",
    orderId: "ord-1",
    occurredAt: "2026-07-05T10:00:00.000Z",
    customerId: "customer-1",
    items: [
      { productId: "bread", quantity: 1, unitPrice: 2.5 },
      { productId: "milk", quantity: 1, unitPrice: 1.8 },
    ],
  },
  {
    id: "evt-2",
    type: "ProductViewed",
    occurredAt: "2026-07-05T10:01:00.000Z",
    customerId: "customer-1",
    productId: "bread",
  },
  {
    id: "evt-3",
    type: "PurchaseCreated",
    orderId: "ord-2",
    occurredAt: "2026-07-05T10:02:00.000Z",
    customerId: "customer-2",
    items: [
      { productId: "bread", quantity: 1, unitPrice: 2.5 },
      { productId: "butter", quantity: 1, unitPrice: 4.2 },
    ],
  },
];

describe("buildSimulationSteps", () => {
  it("builds step snapshots and graph state from the event stream", () => {
    const steps = buildSimulationSteps(events);

    assert.equal(steps.length, 3);
    assert.equal(steps[0]?.before.totalEvents, 0);
    assert.equal(steps[0]?.after.totalPurchases, 1);
    assert.deepEqual(steps[0]?.highlightedProductIds, ["bread", "milk"]);

    assert.equal(steps[1]?.stage, "ingesta");
    assert.equal(steps[1]?.after.totalPurchases, 1);
    assert.deepEqual(steps[1]?.highlightedProductIds, ["bread"]);

    assert.equal(steps[2]?.after.totalEvents, 3);
    assert.equal(steps[2]?.after.totalPurchases, 2);
    assert.deepEqual(
      [...(steps[2]?.graph.edges ?? [])].sort((left, right) =>
        left.target.localeCompare(right.target),
      ),
      [
      { source: "bread", target: "butter", weight: 1 },
      { source: "bread", target: "milk", weight: 1 },
      ],
    );
  });
});
