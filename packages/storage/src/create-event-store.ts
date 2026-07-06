import type { EventStore } from "../../shared/src/index.ts";
import { InMemoryEventStore } from "./in-memory-event-store.ts";
import { PostgresEventStore } from "./postgres-event-store.ts";

export function createEventStoreFromEnvironment(
  environment = process.env,
): EventStore {
  const connectionString = environment.DATABASE_URL?.trim();

  if (connectionString) {
    return new PostgresEventStore(connectionString);
  }

  return new InMemoryEventStore();
}
