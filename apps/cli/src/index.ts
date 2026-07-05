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
  renderEvents,
  renderFeedback,
  renderPopular,
  renderStats,
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
  .alias("graph")
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
