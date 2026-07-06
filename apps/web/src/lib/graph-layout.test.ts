import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildGraphLayout } from "./graph-layout";

describe("buildGraphLayout", () => {
  it("keeps the focused node in the center and includes linked nodes", () => {
    const layout = buildGraphLayout(
      [
        { id: "bread", purchaseCount: 5, degree: 2 },
        { id: "butter", purchaseCount: 3, degree: 1 },
      ],
      [
        { source: "bread", target: "butter", weight: 4 },
        { source: "bread", target: "jam", weight: 2 },
      ],
      {
        width: 640,
        height: 420,
        focusId: "bread",
        highlightedIds: ["jam"],
      },
    );

    const focus = layout.nodes.find((node) => node.id === "bread");
    const linked = layout.nodes.find((node) => node.id === "jam");

    assert.ok(focus);
    assert.equal(focus.x, 320);
    assert.equal(focus.y, 210);
    assert.equal(linked?.emphasis, "highlight");
    assert.equal(layout.edges.length, 2);
  });

  it("creates a bounded overview graph without a focus node", () => {
    const layout = buildGraphLayout(
      [
        { id: "a", purchaseCount: 9, degree: 4 },
        { id: "b", purchaseCount: 8, degree: 3 },
        { id: "c", purchaseCount: 7, degree: 2 },
      ],
      [{ source: "a", target: "b", weight: 3 }],
      {
        width: 600,
        height: 300,
      },
    );

    assert.equal(layout.nodes.length, 3);
    assert.equal(layout.edges.length, 1);
    for (const node of layout.nodes) {
      assert.ok(node.x >= 0);
      assert.ok(node.y >= 0);
    }
  });
});
