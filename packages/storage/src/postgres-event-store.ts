import { Pool } from "pg";

import type { EventStore, RecommendationEvent } from "../../shared/src/index.ts";

export class PostgresEventStore implements EventStore {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async append(event: RecommendationEvent): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO recommendation_events (
          id,
          type,
          occurred_at,
          customer_id,
          metadata,
          payload
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        event.id,
        event.type,
        event.occurredAt,
        event.customerId ?? null,
        JSON.stringify(event.metadata ?? null),
        JSON.stringify(event),
      ],
    );
  }

  async getAll(): Promise<RecommendationEvent[]> {
    const result = await this.pool.query<{ payload: RecommendationEvent }>(
      `
        SELECT payload
        FROM recommendation_events
        ORDER BY occurred_at ASC, id ASC
      `,
    );

    return result.rows.map((row: { payload: RecommendationEvent }) => row.payload);
  }

  async count(): Promise<number> {
    const result = await this.pool.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM recommendation_events
      `,
    );

    return Number(result.rows[0]?.total ?? "0");
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
