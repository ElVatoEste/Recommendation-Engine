CREATE TABLE IF NOT EXISTS recommendation_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  customer_id TEXT NULL,
  metadata JSONB NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_events_type
  ON recommendation_events (type);

CREATE INDEX IF NOT EXISTS idx_recommendation_events_occurred_at
  ON recommendation_events (occurred_at);
