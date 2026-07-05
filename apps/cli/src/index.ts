import { randomUUID } from "node:crypto";

import * as prompts from "@clack/prompts";
import { Command } from "commander";
import ora from "ora";
import pc from "picocolors";

import type { PurchaseItem } from "../../../packages/shared/src/index.ts";
import { ApiError, RecommendationApiClient } from "./client.ts";
import {
  renderAssociations,
  renderCoPurchases,
  renderCustomerProfile,
  renderCustomerRecommendations,
  renderCustomers,
  renderEmbeddingRecommendations,
  renderEvaluation,
  renderEvents,
  renderFeedback,
  renderGraph,
  renderHybrid,
  renderPopular,
  renderSimilarCustomers,
  renderSimilarProducts,
  renderStats,
  renderTrends,
} from "./render.ts";
import { SAMPLE_FEEDBACK, SAMPLE_ORDERS } from "./seed.ts";

const DEFAULT_API = process.env.API_URL ?? "http://localhost:3000";

const program = new Command();

program
  .name("recommend")
  .description("CLI client for the Recommendation Engine HTTP API")
  .option("--api <url>", "base URL of the API", DEFAULT_API);

function client(): RecommendationApiClient {
  return new RecommendationApiClient(program.opts().api);
}

/** Runs an async action behind a spinner, printing errors cleanly. */
async function withSpinner<T>(
  label: string,
  action: () => Promise<T>,
): Promise<T | undefined> {
  const spinner = ora({ text: label, color: "cyan" }).start();

  try {
    const result = await action();
    spinner.stop();
    return result;
  } catch (error) {
    spinner.stop();
    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    console.error(`${pc.red("✖")} ${message}`);
    process.exitCode = 1;
    return undefined;
  }
}

function heading(text: string): void {
  console.log(`\n${pc.bold(pc.cyan(text))}`);
}

function parseItem(raw: string): PurchaseItem {
  const [productId, quantity, unitPrice] = raw.split(":");

  if (!productId) {
    throw new Error(`Invalid --item "${raw}". Use product[:qty[:price]].`);
  }

  return {
    productId,
    quantity: quantity ? Number(quantity) : 1,
    unitPrice: unitPrice ? Number(unitPrice) : undefined,
  };
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

program
  .command("health")
  .description("check API and storage health")
  .action(async () => {
    const health = await withSpinner("Checking health", () => client().health());
    if (!health) return;

    const dot = health.storageHealthy ? pc.green("●") : pc.red("●");
    console.log(
      `${dot} ${pc.bold(health.status)}  storage=${pc.cyan(health.storageMode)}  ` +
        `events=${health.snapshot.totalEvents}  purchases=${health.snapshot.totalPurchases}  ` +
        `products=${health.snapshot.uniqueProducts}`,
    );
  });

program
  .command("popular")
  .description("show the most popular products")
  .option("-l, --limit <n>", "number of products", "10")
  .action(async (options) => {
    const items = await withSpinner("Fetching popular products", () =>
      client().popular(Number(options.limit)),
    );
    if (!items) return;
    heading("Popular products");
    renderPopular(items);
  });

program
  .command("hybrid [customer]")
  .description("blended popularity + association + collaborative ranking")
  .option("-l, --limit <n>", "number of recommendations", "10")
  .option("--w-pop <n>", "popularity weight")
  .option("--w-assoc <n>", "association weight")
  .option("--w-collab <n>", "collaborative weight")
  .option("--w-trend <n>", "trend weight")
  .action(async (customer, options) => {
    const anyWeight =
      options.wPop !== undefined ||
      options.wAssoc !== undefined ||
      options.wCollab !== undefined ||
      options.wTrend !== undefined;
    const weights = anyWeight
      ? {
          popularity: Number(options.wPop ?? 0),
          association: Number(options.wAssoc ?? 0),
          collaborative: Number(options.wCollab ?? 0),
          trend: Number(options.wTrend ?? 0),
        }
      : undefined;

    const items = await withSpinner(
      customer ? `Blending recommendations for ${customer}` : "Blending recommendations",
      () => client().hybrid(customer, Number(options.limit), weights),
    );
    if (!items) return;
    heading(customer ? `Hybrid recommendations: ${customer}` : "Hybrid recommendations");
    renderHybrid(items);
  });

program
  .command("similar-products <product>")
  .alias("similar")
  .description("products with a similar purchase context (embeddings)")
  .option("-l, --limit <n>", "number of products", "10")
  .action(async (product, options) => {
    const items = await withSpinner(`Finding products similar to ${product}`, () =>
      client().similarProducts(product, Number(options.limit)),
    );
    if (!items) return;
    heading(`Similar to: ${product}`);
    renderSimilarProducts(items);
  });

program
  .command("embedding <customer>")
  .description("embedding-based recommendations for a customer")
  .option("-l, --limit <n>", "number of recommendations", "10")
  .action(async (customer, options) => {
    const items = await withSpinner(`Embedding recommendations for ${customer}`, () =>
      client().embeddingRecommendations(customer, Number(options.limit)),
    );
    if (!items) return;
    heading(`Embedding recommendations: ${customer}`);
    renderEmbeddingRecommendations(items);
  });

program
  .command("evaluate")
  .description("benchmark strategies with leave-one-out (hit-rate, MRR)")
  .option("-k, --k <n>", "cutoff for top-k metrics", "5")
  .action(async (options) => {
    const report = await withSpinner("Running leave-one-out benchmark", () =>
      client().evaluate(Number(options.k)),
    );
    if (!report) return;
    heading("Strategy benchmark");
    renderEvaluation(report);
  });

program
  .command("trending")
  .description("show products with the strongest recent momentum")
  .option("-l, --limit <n>", "number of products", "10")
  .option("-w, --window <days>", "trend window in days")
  .action(async (options) => {
    const items = await withSpinner("Fetching trends", () =>
      client().trending(
        Number(options.limit),
        options.window ? Number(options.window) : undefined,
      ),
    );
    if (!items) return;
    heading("Trending products");
    renderTrends(items);
  });

program
  .command("stats")
  .description("show per-product statistics")
  .action(async () => {
    const items = await withSpinner("Fetching statistics", () => client().stats());
    if (!items) return;
    heading("Product statistics");
    renderStats(items);
  });

program
  .command("co-purchases <product>")
  .alias("co")
  .description("show products co-purchased with a product")
  .option("-l, --limit <n>", "number of edges", "10")
  .action(async (product, options) => {
    const edges = await withSpinner(`Fetching co-purchases for ${product}`, () =>
      client().coPurchases(product, Number(options.limit)),
    );
    if (!edges) return;
    heading(`Co-purchases: ${product}`);
    renderCoPurchases(edges);
  });

program
  .command("associations <product>")
  .alias("assoc")
  .description("show association-rule recommendations for a product")
  .option("-l, --limit <n>", "number of associations", "10")
  .action(async (product, options) => {
    const items = await withSpinner(`Fetching associations for ${product}`, () =>
      client().associations(product, Number(options.limit)),
    );
    if (!items) return;
    heading(`Associations: ${product}`);
    renderAssociations(items);
  });

program
  .command("feedback")
  .description("show recommendation feedback statistics")
  .action(async () => {
    const body = await withSpinner("Fetching feedback", () => client().feedback());
    if (!body) return;
    heading("Recommendation feedback");
    renderFeedback(body.feedback);
  });

program
  .command("customers")
  .description("list customer profiles")
  .action(async () => {
    const items = await withSpinner("Fetching customers", () =>
      client().customers(),
    );
    if (!items) return;
    heading("Customers");
    renderCustomers(items);
  });

program
  .command("customer <id>")
  .description("show a customer profile with collaborative recommendations")
  .option("-l, --limit <n>", "number of recommendations", "10")
  .action(async (id, options) => {
    const limit = Number(options.limit);
    const api = client();

    const result = await withSpinner(`Fetching customer ${id}`, async () => {
      const profile = await api.customerProfile(id);
      const [recommendations, similar] = await Promise.all([
        api.customerRecommendations(id, limit),
        api.similarCustomers(id, limit),
      ]);
      return { profile, recommendations, similar };
    });
    if (!result) return;

    heading(`Customer: ${id}`);
    renderCustomerProfile(result.profile);
    heading("Recommended for this customer");
    renderCustomerRecommendations(result.recommendations);
    heading("Similar customers");
    renderSimilarCustomers(result.similar);
  });

program
  .command("graph")
  .description("show the co-purchase graph and the visual viewer URL")
  .action(async () => {
    const graph = await withSpinner("Fetching graph", () => client().graph());
    if (!graph) return;
    heading("Co-purchase graph");
    renderGraph(graph, `${program.opts().api}/graph/view`);
  });

program
  .command("events")
  .description("show recent events from the store")
  .option("-l, --limit <n>", "number of events", "20")
  .action(async (options) => {
    const body = await withSpinner("Fetching events", () =>
      client().events(Number(options.limit)),
    );
    if (!body) return;
    heading(`Events (${body.returned} of ${body.total})`);
    renderEvents(body.events);
  });

program
  .command("purchase")
  .description("record a purchase (interactive when no items are given)")
  .option("-i, --item <spec...>", "item as product[:qty[:price]]", collect, [])
  .option("-c, --customer <id>", "customer id")
  .option("-o, --order <id>", "order id")
  .action(async (options) => {
    let items: PurchaseItem[] = (options.item as string[]).map(parseItem);
    let customerId: string | undefined = options.customer;

    if (items.length === 0) {
      const interactive = await promptPurchase();
      if (!interactive) return;
      items = interactive.items;
      customerId = customerId ?? interactive.customerId;
    }

    const orderId = options.order ?? `ord-${randomUUID().slice(0, 8)}`;
    const result = await withSpinner("Recording purchase", () =>
      client().purchase({ orderId, customerId, items }),
    );
    if (!result) return;

    console.log(
      `${pc.green("✔")} purchase ${pc.bold(orderId)} recorded ` +
        `(${items.map((i) => i.productId).join(", ")})`,
    );
  });

program
  .command("seed")
  .description("populate the API with a sample dataset")
  .action(async () => {
    heading("Seeding sample dataset");

    const summary = await withSpinner(
      `Sending ${SAMPLE_ORDERS.length} purchases and ${SAMPLE_FEEDBACK.length} feedback events`,
      async () => {
        const api = client();

        for (const [index, order] of SAMPLE_ORDERS.entries()) {
          await api.purchase({
            orderId: `seed-${index + 1}`,
            customerId: order.customerId,
            items: order.items,
          });
        }

        for (const feedback of SAMPLE_FEEDBACK) {
          await api.event(feedback);
        }

        return api.popular(5);
      },
    );
    if (!summary) return;

    console.log(`${pc.green("✔")} seed complete\n`);
    heading("Top products after seeding");
    renderPopular(summary);
    console.log(
      pc.dim(`\nTry: recommend associations bread   |   recommend feedback`),
    );
  });

async function promptPurchase(): Promise<
  { items: PurchaseItem[]; customerId?: string } | undefined
> {
  prompts.intro(pc.cyan("New purchase"));

  const customerId = await prompts.text({
    message: "Customer id (optional)",
    placeholder: "customer-1",
  });
  if (prompts.isCancel(customerId)) return cancel();

  const items: PurchaseItem[] = [];

  while (true) {
    const productId = await prompts.text({
      message: `Product #${items.length + 1} (empty to finish)`,
      placeholder: "bread",
    });
    if (prompts.isCancel(productId)) return cancel();
    if (!productId) break;

    const quantity = await prompts.text({
      message: "Quantity",
      initialValue: "1",
      validate: (value) =>
        Number(value) > 0 ? undefined : "Quantity must be greater than 0.",
    });
    if (prompts.isCancel(quantity)) return cancel();

    const price = await prompts.text({
      message: "Unit price (optional)",
      placeholder: "2.50",
    });
    if (prompts.isCancel(price)) return cancel();

    items.push({
      productId: productId.trim(),
      quantity: Number(quantity),
      unitPrice: price ? Number(price) : undefined,
    });
  }

  if (items.length === 0) {
    prompts.outro(pc.yellow("Nothing to record."));
    return undefined;
  }

  prompts.outro(pc.green(`${items.length} item(s) ready.`));
  return {
    items,
    customerId: customerId ? String(customerId).trim() : undefined,
  };
}

function cancel(): undefined {
  prompts.cancel("Cancelled.");
  return undefined;
}

program.parseAsync().catch((error) => {
  console.error(pc.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
