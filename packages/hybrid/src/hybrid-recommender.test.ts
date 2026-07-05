import { describe, expect, it } from "bun:test";

import { HybridRecommender } from "./hybrid-recommender.ts";

const recommender = new HybridRecommender();

function signals() {
  return {
    popularity: new Map([
      ["a", 100],
      ["b", 50],
    ]),
    association: new Map([
      ["b", 2],
      ["c", 1],
    ]),
    collaborative: new Map([
      ["c", 0.6],
      ["a", 0.3],
    ]),
    trend: new Map<string, number>(),
  };
}

describe("HybridRecommender", () => {
  it("blends normalized signals with default weights", () => {
    const result = recommender.compose(signals());

    // Default weights pop .15 / assoc .3 / collab .35 / trend .2
    // c = .3*0.5(assoc) + .35*1(collab)  = 0.5
    // b = .15*0.5(pop)  + .3*1(assoc)    = 0.375
    // a = .15*1(pop)    + .35*0.5(collab)= 0.325
    expect(result.map((r) => r.productId)).toEqual(["c", "b", "a"]);
    expect(result[0]?.score).toBe(0.5);
    expect(result[0]?.components.collaborative).toBe(1);
    expect(result[0]?.reason).toContain("clientes similares");
  });

  it("respects custom weights", () => {
    const result = recommender.compose(signals(), 10, {
      popularity: 1,
      association: 0,
      collaborative: 0,
      trend: 0,
    });

    // Pure popularity: a (100) then b (50); c has no popularity signal.
    expect(result.map((r) => r.productId)).toEqual(["a", "b"]);
    expect(result[0]?.score).toBe(1);
  });

  it("drops zero-score candidates and honors the limit", () => {
    const result = recommender.compose(signals(), 2);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.score > 0)).toBe(true);
  });
});
