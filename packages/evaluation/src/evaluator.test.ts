import { describe, expect, it } from "bun:test";

import type { CoPurchaseGraph } from "../../shared/src/index.ts";
import { Evaluator } from "./evaluator.ts";

describe("Evaluator", () => {
  it("scores strategies with leave-one-out hit-rate", () => {
    // Two customers with identical baskets: holding one product out of either
    // should be recoverable from the twin via collaborative/embedding signals.
    const customerSets = [
      { customerId: "a", products: new Set(["bread", "milk", "eggs"]) },
      { customerId: "b", products: new Set(["bread", "milk", "eggs"]) },
      { customerId: "c", products: new Set(["coffee", "sugar"]) },
    ];

    const graph: CoPurchaseGraph = {
      nodes: [],
      edges: [
        { source: "bread", target: "milk", weight: 2 },
        { source: "bread", target: "eggs", weight: 2 },
        { source: "milk", target: "eggs", weight: 2 },
        { source: "coffee", target: "sugar", weight: 1 },
      ],
    };

    const report = new Evaluator().evaluate({
      customerSets,
      popularityOrder: ["bread", "milk", "eggs", "coffee", "sugar"],
      graph,
      k: 3,
    });

    expect(report.k).toBe(3);
    // a and b qualify (>=2 products); c's held-out has no twin support.
    expect(report.customersEvaluated).toBe(3);
    expect(report.strategies).toHaveLength(4);

    const collaborative = report.strategies.find(
      (s) => s.strategy === "collaborative",
    );
    // a/b are twins, so collaborative recovers the held-out product for both.
    expect(collaborative!.hitRate).toBeGreaterThanOrEqual(0.6);

    for (const strategy of report.strategies) {
      expect(strategy.hitRate).toBeGreaterThanOrEqual(0);
      expect(strategy.hitRate).toBeLessThanOrEqual(1);
    }
  });

  it("evaluates nobody when customers have fewer than two products", () => {
    const report = new Evaluator().evaluate({
      customerSets: [{ customerId: "a", products: new Set(["bread"]) }],
      popularityOrder: ["bread"],
      graph: { nodes: [], edges: [] },
      k: 5,
    });

    expect(report.customersEvaluated).toBe(0);
    expect(report.strategies.every((s) => s.hitRate === 0)).toBe(true);
  });
});
