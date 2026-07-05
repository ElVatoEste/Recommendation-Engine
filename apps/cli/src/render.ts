import Table from "cli-table3";
import pc from "picocolors";

import type {
  AssociationRecommendation,
  CoPurchaseEdge,
  CoPurchaseGraph,
  CustomerProfile,
  CustomerRecommendation,
  CustomerSimilarity,
  EmbeddingRecommendation,
  FeedbackStats,
  HybridRecommendation,
  ProductSimilarity,
  PopularRecommendation,
  ProductStats,
  RecommendationEvent,
  TrendStat,
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

/** Renders a normalized component value as a compact bar. */
function bar(value: number): string {
  const filled = Math.round(value * 8);
  return pc.cyan("█".repeat(filled)) + pc.dim("·".repeat(8 - filled));
}

export function renderHybrid(items: HybridRecommendation[]): void {
  if (items.length === 0) return renderEmpty("no recommendations yet");

  const t = table(["Product", "Score", "Pop", "Assoc", "Collab", "Trend", "Why"]);
  for (const item of items) {
    t.push([
      pc.bold(item.productId),
      pc.yellow(item.score.toFixed(4)),
      bar(item.components.popularity),
      bar(item.components.association),
      bar(item.components.collaborative),
      bar(item.components.trend),
      pc.dim(item.reason),
    ]);
  }
  console.log(t.toString());
}

export function renderSimilarProducts(items: ProductSimilarity[]): void {
  if (items.length === 0) return renderEmpty("no similar products");

  const t = table(["Product", "Similarity", "Why"]);
  for (const item of items) {
    t.push([pc.bold(item.productId), pc.cyan(item.score.toFixed(4)), pc.dim(item.reason)]);
  }
  console.log(t.toString());
}

export function renderEmbeddingRecommendations(
  items: EmbeddingRecommendation[],
): void {
  if (items.length === 0) {
    return renderEmpty("no embedding recommendations (needs purchase history)");
  }

  const t = table(["Product", "Score", "Why"]);
  for (const item of items) {
    t.push([pc.bold(item.productId), pc.yellow(item.score.toFixed(4)), pc.dim(item.reason)]);
  }
  console.log(t.toString());
}

export function renderTrends(items: TrendStat[]): void {
  if (items.length === 0) return renderEmpty("no trend data yet");

  const t = table(["Product", "Recent", "Previous", "Growth", "Why"]);
  for (const item of items) {
    const growth = `${item.growthRate > 0 ? "+" : ""}${Math.round(item.growthRate * 100)}%`;
    const colored =
      item.growthRate > 0
        ? pc.green(growth)
        : item.growthRate < 0
          ? pc.red(growth)
          : pc.dim(growth);
    t.push([
      pc.bold(item.productId),
      pc.yellow(String(item.recentCount)),
      String(item.previousCount),
      colored,
      pc.dim(item.reason),
    ]);
  }
  console.log(t.toString());
}

export function renderCustomers(items: CustomerProfile[]): void {
  if (items.length === 0) return renderEmpty("no customers yet");

  const t = table(["Customer", "Orders", "Products", "Spend", "Last seen"]);
  for (const item of items) {
    t.push([
      pc.bold(item.customerId),
      item.orderCount,
      item.uniqueProducts,
      pc.green(money(item.totalSpend)),
      pc.dim(item.lastSeenAt),
    ]);
  }
  console.log(t.toString());
}

export function renderCustomerProfile(profile: CustomerProfile): void {
  console.log(
    `  ${pc.dim("orders")} ${pc.bold(String(profile.orderCount))}   ` +
      `${pc.dim("products")} ${pc.bold(String(profile.uniqueProducts))}   ` +
      `${pc.dim("spend")} ${pc.green(money(profile.totalSpend))}   ` +
      `${pc.dim("since")} ${pc.dim(profile.firstSeenAt)}`,
  );

  const t = table(["Product", "Times bought"]);
  for (const product of profile.products) {
    t.push([pc.bold(product.productId), pc.yellow(String(product.purchaseCount))]);
  }
  console.log(t.toString());
}

export function renderCustomerRecommendations(
  items: CustomerRecommendation[],
): void {
  if (items.length === 0) {
    return renderEmpty("no collaborative recommendations (needs similar customers)");
  }

  const t = table(["Product", "Score", "Similar buyers", "Why"]);
  for (const item of items) {
    t.push([
      pc.bold(item.productId),
      pc.yellow(item.score.toFixed(4)),
      String(item.supportingCustomers),
      pc.dim(item.reason),
    ]);
  }
  console.log(t.toString());
}

export function renderSimilarCustomers(items: CustomerSimilarity[]): void {
  if (items.length === 0) return renderEmpty("no similar customers");

  const t = table(["Customer", "Similarity", "Shared products"]);
  for (const item of items) {
    t.push([
      pc.bold(item.customerId),
      pc.cyan(item.score.toFixed(4)),
      String(item.sharedProducts),
    ]);
  }
  console.log(t.toString());
}

export function renderGraph(graph: CoPurchaseGraph, viewUrl: string): void {
  if (graph.nodes.length === 0) return renderEmpty("graph is empty");

  console.log(
    `  ${pc.bold(String(graph.nodes.length))} products · ` +
      `${pc.bold(String(graph.edges.length))} edges`,
  );

  const t = table(["Source", "Target", "Weight"]);
  for (const edge of graph.edges.slice(0, 15)) {
    t.push([pc.bold(edge.source), pc.bold(edge.target), pc.yellow(String(edge.weight))]);
  }
  console.log(t.toString());
  if (graph.edges.length > 15) {
    console.log(pc.dim(`  … and ${graph.edges.length - 15} more edges`));
  }
  console.log(`\n  ${pc.dim("Visual graph:")} ${pc.cyan(viewUrl)}`);
}

function summarizeEvent(event: RecommendationEvent): string {
  if (event.type === "PurchaseCreated" || event.type === "CartAbandoned") {
    return event.items.map((item) => `${item.productId}x${item.quantity}`).join(", ");
  }
  if ("productId" in event) return event.productId;
  if ("recommendationProductId" in event) return event.recommendationProductId;
  return "";
}
