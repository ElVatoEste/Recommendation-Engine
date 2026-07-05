import { describe, expect, it } from "bun:test";

import { cosine, intersectionSize, jaccard } from "./set-similarity.ts";

describe("set similarity", () => {
  it("computes Jaccard similarity", () => {
    const a = new Set(["bread", "milk"]);
    const b = new Set(["bread", "milk", "butter"]);

    // |{bread, milk}| / |{bread, milk, butter}| = 2 / 3
    expect(jaccard(a, b)).toBeCloseTo(0.6667, 4);
    expect(jaccard(a, a)).toBe(1);
    expect(jaccard(a, new Set(["coffee"]))).toBe(0);
  });

  it("treats empty sets as dissimilar", () => {
    expect(jaccard(new Set(), new Set(["a"]))).toBe(0);
    expect(cosine(new Set(), new Set())).toBe(0);
  });

  it("computes cosine similarity over set membership", () => {
    const a = new Set(["bread", "milk"]);
    const b = new Set(["bread", "milk", "butter", "eggs"]);

    // 2 / sqrt(2 * 4) = 2 / 2.8284
    expect(cosine(a, b)).toBeCloseTo(0.7071, 4);
    expect(intersectionSize(a, b)).toBe(2);
  });
});
