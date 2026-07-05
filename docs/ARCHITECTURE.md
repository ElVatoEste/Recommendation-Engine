# Architecture

Recommendation Engine is structured as a modular monorepo where ingestion, storage,
statistics, ranking, and future learning layers can evolve independently.

## Current runtime

```text
HTTP API
  |
  v
Recommendation Engine
  |
  +--> Event Store (memory or PostgreSQL)
  |
  +--> Product Statistics Tracker
  |
  +--> Co-Purchase Graph Tracker
  |
  +--> Popular Products Ranker
  |
  +--> Association Ranker (reweighted by feedback)
  |
  +--> Recommendation Feedback Tracker
  |
  +--> Customer Profiles -> Collaborative Recommender (set similarity)
  |
  +--> Product Embeddings (co-occurrence vectors, item-item + taste-profile)
  |
  +--> Trend Tracker (recent-vs-previous window momentum)
  |
  +--> Hybrid Recommender (weighted blend of popularity + association + collaborative + trend)
```

## Current packages

- `packages/shared`: domain types and validation helpers
- `packages/storage`: event store abstraction and in-memory implementation
- `packages/graph`: co-purchase graph construction
- `packages/statistics`: incremental product statistics
- `packages/ranking`: recommendation ranking strategies
- `packages/feedback`: recommendation feedback tracking and scoring
- `packages/similarity`: set-similarity metrics (Jaccard, cosine)
- `packages/customers`: customer profiles and user-based collaborative filtering
- `packages/embeddings`: co-occurrence product embeddings and taste-profile scoring
- `packages/trends`: windowed trend/momentum signals
- `packages/hybrid`: weighted, explainable blend of the ranking signals
- `packages/evaluation`: offline leave-one-out benchmark across strategies
- `packages/experiments`: A/B variant assignment and conversion tracking
- `packages/engine`: orchestration layer over ingestion and queries
- `apps/api`: local HTTP API for manual testing
- `apps/cli`: HTTP client CLI (tables, colors, interactive purchase, dataset seeding)
- `apps/playground`: sample dataset runner for quick iteration

## Design principles

- Event-driven ingestion first
- Simple algorithms before heavy ML
- Explainability over opaque scoring
- Isolated modules for future pluggable strategies
- Incremental evolution from statistics to hybrid recommendation

## Streaming

`ingestEvent` fans out to subscribers, which the HTTP API exposes as a
Server-Sent Events stream (`GET /events/stream`). Batch ingestion
(`POST /events/batch`) and the live-updating graph viewer build on the same
subscription, so recommendations and the graph refresh in real time.

## Next architectural step

The next layer is precomputed persistence for graph-derived features plus
customer-level behavior models, which unlock similarity, collaborative filtering,
and richer explainable ranking.
