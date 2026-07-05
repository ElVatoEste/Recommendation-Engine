# Roadmap

## Phase 1 - Foundation

- [x] Monorepo structure with Bun + TypeScript
- [x] Event ingestion for `PurchaseCreated`
- [x] In-memory event storage
- [x] PostgreSQL-backed event storage
- [x] Product statistics
- [x] Popular products ranking
- [x] Generic event endpoint
- [x] Minimal HTTP API and playground

## Phase 2 - Relationships

- [x] Product co-purchase graph
- [x] Association metrics
- [x] Similarity calculations
- [x] Explainable co-purchase recommendations
- [x] Interactive co-purchase graph visualizer

## Near-term (Phase 2 -> 3 bridge)

- [ ] Persist precomputed statistics and graph
- [x] Read endpoint for historical events
- [x] Feed recommendation feedback into ranking
- [x] Per-customer segmentation (profiles)
- [ ] Integration tests against a real PostgreSQL

## Phase 3 - Personalization

- [x] User profiles
- [x] Collaborative filtering
- [x] Ranking composition
- [x] Recommendation explanations

## Phase 4 - Hybrid Intelligence

- [x] Embeddings and ML-assisted scoring
- [x] Hybrid ranking pipeline
- [x] Trend / momentum signals
- [x] Evaluation and benchmarking

## Phase 5 - Production Readiness

- [ ] Persistent event store
- [ ] Streaming ingestion
- [ ] Real-time recommendation refresh
- [ ] A/B testing and feedback loops
