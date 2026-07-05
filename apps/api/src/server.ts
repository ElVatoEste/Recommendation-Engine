import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { RecommendationEngine } from "../../../packages/engine/src/index.ts";
import {
  type RecommendationEvent,
  validatePurchaseCreatedEvent,
  validateRecommendationEvent,
} from "../../../packages/shared/src/index.ts";
import { createEventStoreFromEnvironment } from "../../../packages/storage/src/index.ts";

const eventStore = createEventStoreFromEnvironment();
const engine = new RecommendationEngine(eventStore);
const port = Number(process.env.PORT ?? 3000);
const storageMode = process.env.DATABASE_URL ? "postgres" : "memory";

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function withEventDefaults(body: unknown): unknown {
  if (typeof body !== "object" || body === null) {
    return body;
  }

  const candidate = body as Record<string, unknown>;

  return {
    ...candidate,
    id: candidate.id ?? randomUUID(),
    occurredAt: candidate.occurredAt ?? new Date().toISOString(),
  };
}

async function ingestAndRespond(
  response: ServerResponse,
  event: RecommendationEvent,
): Promise<void> {
  await engine.ingestEvent(event);

  sendJson(response, 201, {
    message: `${event.type} processed.`,
    event,
    snapshot: engine.getSnapshot(),
  });
}

async function main(): Promise<void> {
  await engine.initialize();

  const server = createServer(async (request, response) => {
    const method = request.method ?? "GET";
    const url = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? "localhost"}`,
    );

    try {
      if (method === "GET" && url.pathname === "/health") {
        let storageHealthy = true;

        try {
          await eventStore.count();
        } catch {
          storageHealthy = false;
        }

        sendJson(response, storageHealthy ? 200 : 503, {
          status: storageHealthy ? "ok" : "degraded",
          storageMode,
          storageHealthy,
          snapshot: engine.getSnapshot(),
        });
        return;
      }

      if (method === "GET" && url.pathname === "/recommendations/popular") {
        const limit = Number(url.searchParams.get("limit") ?? "10");
        sendJson(response, 200, {
          generatedAt: new Date().toISOString(),
          recommendations: engine.getPopularProducts(limit),
        });
        return;
      }

      if (method === "GET" && url.pathname === "/stats/products") {
        sendJson(response, 200, {
          products: engine.getSnapshot().productStats,
        });
        return;
      }

      if (method === "GET" && url.pathname === "/graph/co-purchases") {
        const productId = url.searchParams.get("productId") ?? "";
        const limit = Number(url.searchParams.get("limit") ?? "10");

        if (!productId) {
          throw new Error("Query parameter productId is required.");
        }

        sendJson(response, 200, {
          productId,
          edges: engine.getCoPurchases(productId, limit),
        });
        return;
      }

      if (method === "GET" && url.pathname === "/associations") {
        const productId = url.searchParams.get("productId") ?? "";
        const limit = Number(url.searchParams.get("limit") ?? "10");

        if (!productId) {
          throw new Error("Query parameter productId is required.");
        }

        sendJson(response, 200, {
          productId,
          associations: engine.getAssociations(productId, limit),
        });
        return;
      }

      if (method === "POST" && url.pathname === "/events") {
        const body = withEventDefaults(await readJsonBody(request));
        const event = validateRecommendationEvent(body);

        await ingestAndRespond(response, event);
        return;
      }

      if (method === "POST" && url.pathname === "/events/purchase") {
        const rawBody = await readJsonBody(request);
        const body =
          typeof rawBody === "object" && rawBody !== null
            ? withEventDefaults({
                type: "PurchaseCreated",
                ...(rawBody as Record<string, unknown>),
              })
            : rawBody;
        const event = validatePurchaseCreatedEvent(body);

        await ingestAndRespond(response, event);
        return;
      }

      sendJson(response, 404, {
        error: "Route not found.",
        availableRoutes: [
          "GET /health",
          "GET /recommendations/popular?limit=5",
          "GET /stats/products",
          "GET /graph/co-purchases?productId=bread&limit=5",
          "GET /associations?productId=bread&limit=5",
          "POST /events",
          "POST /events/purchase",
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected server error.";
      sendJson(response, 400, { error: message });
    }
  });

  server.listen(port, () => {
    console.log(
      `Recommendation API listening on http://localhost:${port} using ${storageMode} storage`,
    );
  });

  const shutdown = (signal: string): void => {
    console.log(`\nReceived ${signal}, shutting down.`);
    server.close(async () => {
      await engine.close();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("Failed to start Recommendation API.", error);
  process.exit(1);
});
