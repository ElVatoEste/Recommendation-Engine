import { describe, expect, it } from "bun:test";

import { ExperimentRegistry } from "./experiment-registry.ts";

function newRegistry(): ExperimentRegistry {
  const registry = new ExperimentRegistry();
  registry.define({
    id: "exp",
    variants: [
      { id: "a", allocation: 1 },
      { id: "b", allocation: 1 },
    ],
  });
  return registry;
}

describe("ExperimentRegistry", () => {
  it("assigns customers deterministically", () => {
    const registry = newRegistry();

    const first = registry.assign("exp", "customer-1")?.id;
    const again = registry.assign("exp", "customer-1")?.id;
    expect(first).toBe(again!);
    expect(["a", "b"]).toContain(first!);
  });

  it("splits a population across variants", () => {
    const registry = newRegistry();
    const counts: Record<string, number> = { a: 0, b: 0 };

    for (let index = 0; index < 200; index += 1) {
      const variant = registry.assign("exp", `customer-${index}`)!;
      counts[variant.id] += 1;
    }

    // Both variants should get a meaningful share of a 50/50 split.
    expect(counts.a).toBeGreaterThan(50);
    expect(counts.b).toBeGreaterThan(50);
  });

  it("reports conversions and the best variant", () => {
    const registry = newRegistry();

    // a: 2/3 accepted; b: 0/2 accepted.
    registry.recordOutcome("exp", "a", true);
    registry.recordOutcome("exp", "a", true);
    registry.recordOutcome("exp", "a", false);
    registry.recordOutcome("exp", "b", false);
    registry.recordOutcome("exp", "b", false);

    const report = registry.report("exp")!;
    const a = report.variants.find((v) => v.variantId === "a")!;

    expect(a.impressions).toBe(3);
    expect(a.acceptances).toBe(2);
    expect(a.acceptanceRate).toBe(0.6667);
    expect(report.bestVariant).toBe("a");
  });

  it("returns undefined for unknown experiments", () => {
    const registry = newRegistry();
    expect(registry.assign("missing", "c")).toBeUndefined();
    expect(registry.report("missing")).toBeUndefined();
  });
});
