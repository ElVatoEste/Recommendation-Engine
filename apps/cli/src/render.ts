import Table from "cli-table3";
import pc from "picocolors";

import type {
  AssociationRecommendation,
  CoPurchaseEdge,
  FeedbackStats,
  PopularRecommendation,
  ProductStats,
  RecommendationEvent,
} from "../../../packages/shared/src/index.ts";

const TABLE_STYLE = {
  head: [] as string[],
  border: [] as string[],
};

function table(head: string[]): InstanceType<typeof Table> {
  return new Table({
    head: head.map((label) => pc.cyan(pc.bold(label))),
    style: TABLE_STYLE,
    chars: {
      "top": pc.dim("─"),
      "top-mid": pc.dim("┬"),
      "top-left": pc.dim("┌"),
      "top-right": pc.dim("┐"),
      "bottom": pc.dim("─"),
      "bottom-mid": pc.dim("┴"),
      "bottom-left": pc.dim("└"),
      "bottom-right": pc.dim("┘"),
      "left": pc.dim("│"),
      "left-mid": pc.dim("├"),
      "mid": pc.dim("─"),
      "mid-mid": pc.dim("┼"),
      "right": pc.dim("│"),
      "right-mid": pc.dim("┤"),
      "middle": pc.dim("│"),
    },
  });
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Colors a feedback factor: green boost, red penalty, dim neutral. */
function factorColor(factor: number): string {
  const text = factor.toFixed(4);
  if (factor > 1) return pc.green(text);
  if (factor < 1) return pc.red(text);
  return pc.dim(text);
}

export function renderEmpty(message: string): void {
  console.log(pc.dim(`  (${message})`));
}

export function renderPopular(items: PopularRecommendation[]): void {
  if (items.length === 0) return renderEmpty("no products yet");

  const t = table(["#", "Product", "Score", "Purchases", "Qty", "Revenue"]);
  items.forEach((item, index) => {
    t.push([
      pc.dim(String(index + 1)),
      pc.bold(item.productId),
      pc.yellow(item.score.toFixed(2)),
      item.stats.purchaseCount,
      item.stats.quantitySold,
      pc.green(money(item.stats.revenue)),
    ]);
  });
  console.log(t.toString());
}

export function renderStats(items: ProductStats[]): void {
  if (items.length === 0) return renderEmpty("no products yet");

  const t = table(["Product", "Purchases", "Qty sold", "Revenue", "Last purchase"]);
  for (const item of items) {
    t.push([
      pc.bold(item.productId),
      item.purchaseCount,
      item.quantitySold,
      pc.green(money(item.revenue)),
      pc.dim(item.lastPurchasedAt ?? "-"),
    ]);
  }
  console.log(t.toString());
}

export function renderCoPurchases(edges: CoPurchaseEdge[]): void {
  if (edges.length === 0) return renderEmpty("no co-purchases for this product");

  const t = table(["Related product", "Co-purchases"]);
  for (const edge of edges) {
    t.push([pc.bold(edge.relatedProductId), pc.yellow(String(edge.coPurchaseCount))]);
  }
  console.log(t.toString());
}

export function renderAssociations(items: AssociationRecommendation[]): void {
  if (items.length === 0) return renderEmpty("no associations for this product");

  const t = table([
    "Target",
    "Support",
    "Confidence",
    "Lift",
    "Feedback",
    "Adj. score",
  ]);
  for (const item of items) {
    t.push([
      pc.bold(item.targetProductId),
      item.support.toFixed(4),
      item.confidence.toFixed(4),
      item.lift.toFixed(4),
      factorColor(item.feedbackFactor),
      pc.yellow(item.adjustedScore.toFixed(4)),
    ]);
  }
  console.log(t.toString());
}

export function renderFeedback(items: FeedbackStats[]): void {
  if (items.length === 0) return renderEmpty("no recommendation feedback yet");

  const t = table(["Target", "Accepted", "Ignored", "Acceptance", "Factor"]);
  for (const item of items) {
    t.push([
      pc.bold(item.targetProductId),
      pc.green(String(item.accepted)),
      pc.red(String(item.ignored)),
      item.acceptanceRate.toFixed(4),
      factorColor(item.factor),
    ]);
  }
  console.log(t.toString());
}

export function renderEvents(events: RecommendationEvent[]): void {
  if (events.length === 0) return renderEmpty("no events yet");

  const t = table(["When", "Type", "Customer", "Detail"]);
  for (const event of events) {
    t.push([
      pc.dim(event.occurredAt),
      pc.cyan(event.type),
      event.customerId ?? pc.dim("-"),
      pc.dim(summarizeEvent(event)),
    ]);
  }
  console.log(t.toString());
}

function summarizeEvent(event: RecommendationEvent): string {
  if (event.type === "PurchaseCreated" || event.type === "CartAbandoned") {
    return event.items.map((item) => `${item.productId}x${item.quantity}`).join(", ");
  }
  if ("productId" in event) return event.productId;
  if ("recommendationProductId" in event) return event.recommendationProductId;
  return "";
}
