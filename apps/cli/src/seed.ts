import type { PurchaseItem } from "../../../packages/shared/src/index.ts";

interface SeedOrder {
  customerId: string;
  items: PurchaseItem[];
}

const PRICES: Record<string, number> = {
  bread: 2.5,
  milk: 1.8,
  butter: 4.1,
  cheese: 5.3,
  eggs: 3.2,
  coffee: 7.5,
  sugar: 1.2,
  ham: 4.8,
  tomato: 0.9,
  pasta: 1.6,
};

function items(...ids: string[]): PurchaseItem[] {
  return ids.map((productId) => ({
    productId,
    quantity: 1,
    unitPrice: PRICES[productId] ?? 1,
  }));
}

/**
 * A small but structured dataset: bread+milk co-occur often, coffee+sugar form
 * a second cluster, so popular products and associations come out meaningful.
 */
export const SAMPLE_ORDERS: SeedOrder[] = [
  { customerId: "c-1", items: items("bread", "milk", "eggs") },
  { customerId: "c-2", items: items("bread", "milk") },
  { customerId: "c-3", items: items("bread", "milk", "butter") },
  { customerId: "c-4", items: items("bread", "butter") },
  { customerId: "c-5", items: items("bread", "milk", "cheese") },
  { customerId: "c-6", items: items("coffee", "sugar") },
  { customerId: "c-7", items: items("coffee", "sugar", "milk") },
  { customerId: "c-8", items: items("coffee", "milk") },
  { customerId: "c-9", items: items("pasta", "tomato", "cheese") },
  { customerId: "c-10", items: items("pasta", "tomato") },
  { customerId: "c-11", items: items("bread", "milk", "ham") },
  { customerId: "c-12", items: items("bread", "eggs", "milk") },
];

/** source -> target recommendation feedback, seeded so the loop is visible. */
export const SAMPLE_FEEDBACK: Array<{
  type: "RecommendationAccepted" | "RecommendationIgnored";
  sourceProductId: string;
  recommendationProductId: string;
}> = [
  { type: "RecommendationAccepted", sourceProductId: "bread", recommendationProductId: "milk" },
  { type: "RecommendationAccepted", sourceProductId: "bread", recommendationProductId: "milk" },
  { type: "RecommendationIgnored", sourceProductId: "bread", recommendationProductId: "butter" },
  { type: "RecommendationIgnored", sourceProductId: "bread", recommendationProductId: "butter" },
];
