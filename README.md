<div align="center">
  <img src="assets/banner.svg" alt="Recommendation Engine banner" width="100%">

  <h1>Recommendation Engine</h1>

  <p><strong>Modular recommendation system built from first principles.</strong></p>
  <p>Event-driven ingestion, product statistics, explainable ranking, and a roadmap that grows from simple signals into graph, collaborative, and hybrid recommendation strategies.</p>

  <p>
    <img src="https://img.shields.io/badge/status-phases%201--5%20implemented-2563eb" alt="Status: Phases 1-5 implemented">
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

The repository implements the full roadmap (Phases 1-5) from first principles:

- event ingestion (single, batch, and a Server-Sent Events stream)
- in-memory and PostgreSQL-backed event stores
- product statistics and popular-products ranking
- co-purchase graph with an interactive, live-updating visualizer
- association rules reweighted by a recommendation feedback loop
- customer profiles and user-based collaborative filtering
- co-occurrence product embeddings and taste-profile scoring
- trend/momentum signals
- a weighted, explainable hybrid ranking that blends every signal
- offline leave-one-out benchmarking across strategies
- A/B experiments with deterministic assignment and best-variant selection
- an HTTP API, a CLI client, and a local playground

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
bun run cli customers                 # customer profiles
bun run cli customer c-1              # profile + collaborative recs + similar
bun run cli hybrid c-1                # blended popularity + association + collaborative + trend
bun run cli hybrid c-1 --w-collab 1 --w-pop 0 --w-assoc 0 --w-trend 0
bun run cli trending                  # products with recent momentum
bun run cli similar-products bread    # embedding neighbors (shared context)
bun run cli embedding c-1             # embedding-based recommendations
bun run cli evaluate                  # leave-one-out benchmark of strategies
bun run cli experiments               # list A/B experiments
bun run cli experiment default c-1    # variant assignment + recommendations
bun run cli experiment-report default # conversion + best-converting variant
bun run cli graph                     # co-purchase edges + visualizer URL
bun run cli purchase -i bread:1:2.5 -i milk:2:1.8 -c customer-1
bun run cli purchase                  # interactive prompts
bun run cli health
```

Open `http://localhost:3000/graph/view` in a browser for an interactive,
force-directed view of the co-purchase graph. It subscribes to
`/events/stream` and re-renders in real time as new purchases arrive.

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
- `GET /recommendations/hybrid?customer=c-1&limit=5` (optional `wPop`, `wAssoc`, `wCollab`, `wTrend` weights)
- `GET /recommendations/trending?limit=5&windowDays=30`
- `GET /evaluate?k=5` — leave-one-out benchmark across strategies
- `GET /experiments` · `POST /experiments`
- `GET /experiments/:id/report` — A/B conversion + best variant
- `GET /experiments/:id/recommendations?customer=c-1&limit=5`
- `GET /stats/products`
- `GET /graph/co-purchases?productId=bread&limit=5`
- `GET /associations?productId=bread&limit=5`
- `GET /feedback/stats`
- `GET /events?limit=50`
- `GET /customers`
- `GET /customers/:id/profile`
- `GET /customers/:id/recommendations?limit=5`
- `GET /customers/:id/similar?limit=5`
- `GET /customers/:id/embedding-recommendations?limit=5`
- `GET /products/:id/similar?limit=5` (embedding-based)
- `GET /graph`
- `GET /graph/view` — interactive graph visualizer (open in a browser)
- `POST /events`
- `POST /events/purchase`
- `POST /events/batch` — ingest an array of events
- `GET /events/stream` — Server-Sent Events stream of ingested events + live snapshot

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
  customers/            customer profiles + collaborative filtering
  embeddings/           co-occurrence product embeddings
  evaluation/           leave-one-out strategy benchmark
  experiments/          A/B testing + variant assignment
  feedback/             recommendation feedback tracker
  graph/                co-purchase graph
  hybrid/               weighted multi-signal ranking
  ranking/              ranking strategies
  shared/               shared domain types and validation
  similarity/           set-similarity metrics (Jaccard, cosine)
  statistics/           incremental product statistics
  storage/              event storage abstractions
  trends/               recent-momentum trend signals
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
