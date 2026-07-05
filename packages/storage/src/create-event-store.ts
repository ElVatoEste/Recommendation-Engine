import type { EventStore } from "../../shared/src/index.ts";
import { InMemoryEventStore } from "./in-memory-event-store.ts";
import { PostgresEventStore } from "./postgres-event-store.ts";

export function createEventStoreFromEnvironment(
  environment = process.env,
): EventStore {
  const connectionString = environment.DATABASE_URL?.trim();

  if (connectionString) {
    const maxConnections = Number(environment.DATABASE_POOL_MAX);

    return new PostgresEventStore(connectionString, {
      maxConnections: Number.isFinite(maxConnections) && maxConnections > 0
        ? maxConnections
        : undefined,
    });
  }

  return new InMemoryEventStore();
}
