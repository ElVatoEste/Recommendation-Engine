import { afterAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

import type { RecommendationEvent } from "../../shared/src/index.ts";
import { PostgresEventStore } from "./postgres-event-store.ts";

// Opt-in integration test against a real Postgres. It is skipped by default
// (so `bun test` stays offline even with a .env present) and runs only when
// RUN_PG_TESTS is set alongside DATABASE_URL, pointing at an instance with the
// migration applied:
//   RUN_PG_TESTS=1 DATABASE_URL=postgres://app:app@localhost:5432/recommendation_engine bun test
const connectionString = process.env.DATABASE_URL;
const shouldRun = Boolean(process.env.RUN_PG_TESTS && connectionString);
const suite = shouldRun ? describe : describe.skip;

suite("PostgresEventStore (integration)", () => {
  const id = `itest-${Date.now()}`;
  const store = new PostgresEventStore(connectionString!);
  const pool = new Pool({ connectionString: connectionString! });

  const event: RecommendationEvent = {
    id,
    type: "PurchaseCreated",
    orderId: `${id}-order`,
    occurredAt: new Date().toISOString(),
    items: [{ productId: "itest-product", quantity: 1, unitPrice: 1 }],
  };

  afterAll(async () => {
    await pool.query("DELETE FROM recommendation_events WHERE id = $1", [id]);
    await pool.end();
    await store.close();
  });

  it("appends and reads back an event", async () => {
    const before = await store.count();
    await store.append(event);

    expect(await store.count()).toBe(before + 1);

    const all = await store.getAll();
    const stored = all.find((candidate) => candidate.id === id);
    expect(stored?.type).toBe("PurchaseCreated");
  });

  it("is idempotent on a conflicting id", async () => {
    const before = await store.count();
    await store.append(event);
    expect(await store.count()).toBe(before);
  });
});
