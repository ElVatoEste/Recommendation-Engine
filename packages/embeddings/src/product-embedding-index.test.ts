import { describe, expect, it } from "bun:test";

import type { CoPurchaseGraph } from "../../shared/src/index.ts";
import { ProductEmbeddingIndex } from "./product-embedding-index.ts";

// bread and cola never co-occur, but both co-occur with milk and chips,
// so their co-occurrence vectors are similar (second-order similarity).
const graph: CoPurchaseGraph = {
  nodes: [],
  edges: [
    { source: "bread", target: "milk", weight: 5 },
    { source: "bread", target: "chips", weight: 4 },
    { source: "cola", target: "milk", weight: 5 },
    { source: "cola", target: "chips", weight: 4 },
    { source: "milk", target: "chips", weight: 1 },
  ],
};

describe("ProductEmbeddingIndex", () => {
  const index = new ProductEmbeddingIndex(graph);

  it("finds second-order similar products", () => {
    const similar = index.similar("bread");
    // cola shares the same neighbors (milk, chips) with matching weights.
    expect(similar[0]?.productId).toBe("cola");
    expect(similar[0]?.score).toBeCloseTo(1, 4);
  });

  it("recommends products fitting the owned taste profile", () => {
    // A customer who bought bread should get cola (same context), never bread.
    const recs = index.recommendForProducts(["bread"]);
    const ids = recs.map((r) => r.productId);

    expect(ids).toContain("cola");
    expect(ids).not.toContain("bread");
    expect(recs.every((r) => r.score > 0)).toBe(true);
  });

  it("returns nothing for unknown or empty input", () => {
    expect(index.similar("unknown")).toEqual([]);
    expect(index.recommendForProducts([])).toEqual([]);
  });
});
