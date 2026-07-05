import { describe, expect, it } from "bun:test";

import type { PurchaseCreatedEvent } from "../../shared/src/index.ts";
import { CollaborativeRecommender } from "./collaborative-recommender.ts";
import { CustomerProfileTracker } from "./customer-profile-tracker.ts";

function purchase(
  customerId: string,
  productIds: string[],
  order: string,
): PurchaseCreatedEvent {
  return {
    id: `evt-${order}`,
    type: "PurchaseCreated",
    orderId: order,
    customerId,
    occurredAt: "2026-07-04T10:00:00.000Z",
    items: productIds.map((productId) => ({
      productId,
      quantity: 1,
      unitPrice: 1,
    })),
  };
}

describe("customer profiles and collaborative filtering", () => {
  const tracker = new CustomerProfileTracker();
  tracker.registerPurchase(purchase("a", ["bread", "milk"], "o1"));
  tracker.registerPurchase(purchase("b", ["bread", "milk", "butter"], "o2"));
  tracker.registerPurchase(purchase("c", ["coffee", "sugar"], "o3"));

  it("aggregates a customer profile", () => {
    const profile = tracker.getProfile("b");
    expect(profile?.orderCount).toBe(1);
    expect(profile?.uniqueProducts).toBe(3);
    expect(profile?.totalSpend).toBe(3);
    expect(profile?.products.map((p) => p.productId)).toEqual([
      "bread",
      "butter",
      "milk",
    ]);
  });

  it("ranks similar customers by Jaccard overlap", () => {
    const recommender = new CollaborativeRecommender();
    const similar = recommender.getSimilarCustomers("a", tracker.getProductSets());

    expect(similar[0]?.customerId).toBe("b");
    expect(similar[0]?.score).toBe(0.6667);
    expect(similar[0]?.sharedProducts).toBe(2);
    // Customer c shares nothing, so it is not a neighbor.
    expect(similar.some((s) => s.customerId === "c")).toBe(false);
  });

  it("recommends products bought by similar customers only", () => {
    const recommender = new CollaborativeRecommender();
    const recs = recommender.recommend("a", tracker.getProductSets());

    expect(recs).toHaveLength(1);
    expect(recs[0]?.productId).toBe("butter");
    expect(recs[0]?.supportingCustomers).toBe(1);
    expect(recs[0]?.score).toBe(0.6667);
  });

  it("returns nothing for an unknown customer", () => {
    const recommender = new CollaborativeRecommender();
    expect(recommender.recommend("z", tracker.getProductSets())).toEqual([]);
    expect(tracker.getProfile("z")).toBeUndefined();
  });
});
