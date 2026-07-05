import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { RecommendationEngine } from "../../../packages/engine/src/index.ts";
import {
  type HybridWeights,
  type RecommendationEvent,
  validatePurchaseCreatedEvent,
  validateRecommendationEvent,
} from "../../../packages/shared/src/index.ts";
import { createEventStoreFromEnvironment } from "../../../packages/storage/src/index.ts";
import { GRAPH_VIEW_HTML } from "./graph-view.ts";

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

function sendHtml(response: ServerResponse, html: string): void {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
}

/** Reads optional wPop/wAssoc/wCollab weights; returns undefined when none set. */
function parseWeights(
  params: URLSearchParams,
): HybridWeights | undefined {
  const keys = [
    ["wPop", "popularity"],
    ["wAssoc", "association"],
    ["wCollab", "collaborative"],
    ["wTrend", "trend"],
  ] as const;

  if (!keys.some(([query]) => params.has(query))) {
    return undefined;
  }

  const weights = { popularity: 0, association: 0, collaborative: 0, trend: 0 };
  for (const [query, key] of keys) {
    const value = Number(params.get(query) ?? "0");
    weights[key] = Number.isFinite(value) && value >= 0 ? value : 0;
  }

  return weights;
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

      if (method === "GET" && url.pathname === "/recommendations/hybrid") {
        const limit = Number(url.searchParams.get("limit") ?? "10");
        const customer = url.searchParams.get("customer") ?? undefined;
        const weights = parseWeights(url.searchParams);

        sendJson(response, 200, {
          customer: customer ?? null,
          recommendations: engine.getHybridRecommendations(
            customer,
            limit,
            weights,
          ),
        });
        return;
      }

      if (method === "GET" && url.pathname === "/recommendations/trending") {
        const limit = Number(url.searchParams.get("limit") ?? "10");
        const windowParam = url.searchParams.get("windowDays");
        const windowMs = windowParam
          ? Number(windowParam) * 24 * 60 * 60 * 1000
          : undefined;

        sendJson(response, 200, {
          generatedAt: new Date().toISOString(),
          trends: engine.getTrends(limit, windowMs),
        });
        return;
      }

      if (method === "GET" && url.pathname === "/evaluate") {
        const k = Number(url.searchParams.get("k") ?? "5");
        sendJson(response, 200, engine.evaluate(k));
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

      if (method === "GET" && url.pathname === "/feedback/stats") {
        sendJson(response, 200, {
          feedback: engine.getFeedbackStats(),
        });
        return;
      }

      if (method === "GET" && url.pathname.startsWith("/products/")) {
        const segments = url.pathname.split("/").filter(Boolean);
        const productId = decodeURIComponent(segments[1] ?? "");
        const limit = Number(url.searchParams.get("limit") ?? "10");

        if (productId && segments[2] === "similar" && segments.length === 3) {
          sendJson(response, 200, {
            productId,
            similar: engine.getSimilarProducts(productId, limit),
          });
          return;
        }
      }

      if (method === "GET" && url.pathname === "/graph/view") {
        sendHtml(response, GRAPH_VIEW_HTML);
        return;
      }

      if (method === "GET" && url.pathname === "/graph") {
        sendJson(response, 200, engine.getGraph());
        return;
      }

      if (method === "GET" && url.pathname === "/customers") {
        sendJson(response, 200, { customers: engine.getAllCustomers() });
        return;
      }

      if (method === "GET" && url.pathname.startsWith("/customers/")) {
        const segments = url.pathname.split("/").filter(Boolean);
        const customerId = decodeURIComponent(segments[1] ?? "");
        const resource = segments[2];
        const limit = Number(url.searchParams.get("limit") ?? "10");

        if (!customerId) {
          throw new Error("Customer id is required.");
        }

        if (resource === "profile" && segments.length === 3) {
          const profile = engine.getCustomerProfile(customerId);
          if (!profile) {
            sendJson(response, 404, {
              error: `Unknown customer: ${customerId}`,
            });
            return;
          }
          sendJson(response, 200, profile);
          return;
        }

        if (resource === "recommendations" && segments.length === 3) {
          sendJson(response, 200, {
            customerId,
            recommendations: engine.getCustomerRecommendations(customerId, limit),
          });
          return;
        }

        if (resource === "similar" && segments.length === 3) {
          sendJson(response, 200, {
            customerId,
            similar: engine.getSimilarCustomers(customerId, limit),
          });
          return;
        }

        if (resource === "embedding-recommendations" && segments.length === 3) {
          sendJson(response, 200, {
            customerId,
            recommendations: engine.getEmbeddingRecommendations(customerId, limit),
          });
          return;
        }
      }

      if (method === "GET" && url.pathname === "/events/stream") {
        response.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        response.write(": connected\n\n");

        const unsubscribe = engine.subscribe((event) => {
          response.write(
            `data: ${JSON.stringify({ event, snapshot: engine.getSnapshot() })}\n\n`,
          );
        });

        const heartbeat = setInterval(() => response.write(": ping\n\n"), 15000);

        request.on("close", () => {
          clearInterval(heartbeat);
          unsubscribe();
        });
        return;
      }

      if (method === "POST" && url.pathname === "/events/batch") {
        const body = await readJsonBody(request);
        const rawEvents =
          typeof body === "object" && body !== null && "events" in body
            ? (body as { events: unknown }).events
            : body;

        if (!Array.isArray(rawEvents)) {
          throw new Error("Body must be an array or { events: [...] }.");
        }

        let accepted = 0;
        for (const raw of rawEvents) {
          const event = validateRecommendationEvent(withEventDefaults(raw));
          await engine.ingestEvent(event);
          accepted += 1;
        }

        sendJson(response, 201, {
          accepted,
          snapshot: engine.getSnapshot(),
        });
        return;
      }

      if (method === "GET" && url.pathname === "/events") {
        const limit = Number(url.searchParams.get("limit") ?? "50");
        const all = await eventStore.getAll();
        const events = limit > 0 ? all.slice(-limit) : all;

        sendJson(response, 200, {
          total: all.length,
          returned: events.length,
          events,
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
          "GET /recommendations/hybrid?customer=c-1&limit=5",
          "GET /recommendations/trending?limit=5&windowDays=30",
          "GET /evaluate?k=5",
          "GET /stats/products",
          "GET /graph/co-purchases?productId=bread&limit=5",
          "GET /associations?productId=bread&limit=5",
          "GET /feedback/stats",
          "GET /events?limit=50",
          "GET /events/stream (server-sent events)",
          "POST /events/batch",
          "GET /graph",
          "GET /graph/view",
          "GET /customers",
          "GET /customers/:id/profile",
          "GET /customers/:id/recommendations?limit=5",
          "GET /customers/:id/similar?limit=5",
          "GET /customers/:id/embedding-recommendations?limit=5",
          "GET /products/:id/similar?limit=5",
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
