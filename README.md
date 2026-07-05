<div align="center">
  <img src="assets/banner.svg" alt="Recommendation Engine banner" width="100%">

  <h1>Recommendation Engine</h1>

  <p><strong>Modular recommendation system built from first principles.</strong></p>
  <p>Event-driven ingestion, product statistics, explainable ranking, and a roadmap that grows from simple signals into graph, collaborative, and hybrid recommendation strategies.</p>

  <p>
    <img src="https://img.shields.io/badge/status-phase%201%20foundation-2563eb" alt="Status: Phase 1 foundation">
    <img src="https://img.shields.io/badge/runtime-Bun-f472b6" alt="Runtime: Bun">
    <img src="https://img.shields.io/badge/language-TypeScript-3178C6?logo=typescript&logoColor=white" alt="Language: TypeScript">
    <img src="https://img.shields.io/badge/architecture-event--driven-10b981" alt="Architecture: event-driven">
    <img src="https://img.shields.io/badge/license-MIT-22c55e" alt="License: MIT">
  </p>
</div>

---

## Why

Most recommendation systems are presented as black boxes or begin too late in the stack.
This project takes the opposite route: start with explicit events and transparent statistics,
then evolve toward relationships, similarity, collaborative filtering, and hybrid scoring.

The goal is not only to produce recommendations, but to understand exactly why they appear.

## What works today

The repository already includes a working Phase 1 foundation:

- `PurchaseCreated` event ingestion
- generic event ingestion for supported event types
- in-memory event store
- PostgreSQL-backed event store through `DATABASE_URL`
- product-level statistics
- popular products ranking
- co-purchase graph
- simple association rules
- minimal HTTP API for local testing
- local playground with sample data

## Recommendation evolution

```text
Statistics
   ->
Association Rules
   ->
Product Graph
   ->
Collaborative Filtering
   ->
Machine Learning
   ->
Hybrid Recommendation System
```

## Quickstart

Install dependencies:

```bash
bun install
```

Run the local API (in-memory store, no database required):

```bash
bun run dev:api
```

Run the sample playground:

```bash
bun run playground
```

## CLI

`apps/cli` is an HTTP client for the API with tables, colors, and an interactive
purchase flow. Start the API in one terminal (`bun run dev:api`), then:

```bash
bun run cli seed                      # populate a sample dataset
bun run cli popular --limit 5
bun run cli associations bread        # feedback-adjusted recommendations
bun run cli co-purchases bread
bun run cli stats
bun run cli feedback
bun run cli events --limit 20
bun run cli purchase -i bread:1:2.5 -i milk:2:1.8 -c customer-1
bun run cli purchase                  # interactive prompts
bun run cli health
```

Target a non-default API with `--api <url>` or the `API_URL` environment variable.

Type-check and test the workspace:

```bash
bun run check
bun run test
```

## API

Available routes:

- `GET /health`
- `GET /recommendations/popular?limit=5`
- `GET /stats/products`
- `GET /graph/co-purchases?productId=bread&limit=5`
- `GET /associations?productId=bread&limit=5`
- `GET /feedback/stats`
- `GET /events?limit=50`
- `POST /events`
- `POST /events/purchase`

Association ranking is reweighted by recommendation feedback: `RecommendationAccepted`
and `RecommendationIgnored` events raise or lower a target's `feedbackFactor`, which
scales its `adjustedScore` and can reorder results.

Example purchase ingestion:

```bash
curl -X POST http://localhost:3000/events/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ord-2001",
    "customerId": "customer-10",
    "items": [
      { "productId": "bread", "quantity": 1, "unitPrice": 2.5 },
      { "productId": "milk", "quantity": 2, "unitPrice": 1.8 }
    ]
  }'
```

## Architecture

```text
HTTP API
  |
  v
Recommendation Engine
  |
  +--> Event Store
  +--> Product Statistics
  +--> Ranking Strategies
```

More detail: [Architecture](docs/ARCHITECTURE.md)

## PostgreSQL persistence

If `DATABASE_URL` is set, the API uses PostgreSQL as the event store instead of memory.

### With Docker (recommended)

`docker-compose.yml` runs Postgres and applies `migrations/*.sql` automatically on first
start. Copy the environment template and bring the database up:

```bash
cp .env.example .env
bun run db:up          # start Postgres in the background
bun run dev:api        # API picks up DATABASE_URL from .env
```

Run the whole stack (API + Postgres) in containers:

```bash
bun run stack:up       # build + start api and postgres
bun run stack:down     # stop everything
```

Useful scripts: `db:up`, `db:down`, `db:logs`, `stack:up`, `stack:down`.

### Without Docker

Point `DATABASE_URL` at any Postgres instance and apply the migration once:

```bash
psql "$DATABASE_URL" -f migrations/001_postgres_event_store.sql
DATABASE_URL=postgres://app:app@localhost:5432/recommendation_engine bun run dev:api
```

Optional: `DATABASE_POOL_MAX` tunes the connection pool size (default `10`).

## Project layout

```text
apps/
  api/                  local HTTP API
  cli/                  HTTP client CLI
  playground/           sample dataset runner
packages/
  engine/               orchestration layer
  feedback/             recommendation feedback tracker
  graph/                co-purchase graph
  ranking/              ranking strategies
  shared/               shared domain types and validation
  statistics/           incremental product statistics
  storage/              event storage abstractions
docs/
  ARCHITECTURE.md       current system shape
  ROADMAP.md            project roadmap
migrations/
  001_postgres_event_store.sql
docker-compose.yml      Postgres + optional API stack
Dockerfile              Bun API image
assets/
  banner.svg            repository banner
```

## Roadmap

Current direction:

- Phase 1: event ingestion, storage, statistics, popular products
- Phase 2: co-purchase graph, associations, similarity
- Phase 3: collaborative filtering and explainable ranking
- Phase 4: ML-assisted and hybrid recommendation
- Phase 5: streaming, feedback loops, experimentation

Full roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)

## Design principles

- modular architecture
- explainability over opacity
- event-driven design
- algorithm-first evolution
- extensible package boundaries
- reproducible experiments

## Use cases

The engine is intentionally domain-agnostic:

- e-commerce
- grocery and retail
- media and streaming
- education platforms
- hospitality
- financial products
- inventory optimization

## Status

This repository is in active early development, but the current codebase is runnable and already demonstrates the first recommendation layer end to end.

## License

This project is licensed under the [MIT License](LICENSE).
