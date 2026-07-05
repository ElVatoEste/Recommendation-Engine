import type { EventStore, RecommendationEvent } from "../../shared/src/index.ts";

export class InMemoryEventStore implements EventStore {
  private readonly events: RecommendationEvent[];

  constructor(initialEvents: RecommendationEvent[] = []) {
    this.events = [...initialEvents];
  }

  async append(event: RecommendationEvent): Promise<void> {
    this.events.push(event);
  }

  async getAll(): Promise<RecommendationEvent[]> {
    return [...this.events];
  }

  async count(): Promise<number> {
    return this.events.length;
  }

  async close(): Promise<void> {
    // No resources to release for the in-memory store.
  }
}
