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
- [ ] Similarity calculations
- [x] Explainable co-purchase recommendations

## Near-term (Phase 2 -> 3 bridge)

- [ ] Persist precomputed statistics and graph
- [x] Read endpoint for historical events
- [x] Feed recommendation feedback into ranking
- [ ] Per-customer segmentation
- [ ] Integration tests against a real PostgreSQL

## Phase 3 - Personalization

- [ ] User profiles
- [ ] Collaborative filtering
- [ ] Ranking composition
- [ ] Recommendation explanations

## Phase 4 - Hybrid Intelligence

- [ ] Embeddings and ML-assisted scoring
- [ ] Hybrid ranking pipeline
- [ ] Seasonality and trend signals
- [ ] Evaluation and benchmarking

## Phase 5 - Production Readiness

- [ ] Persistent event store
- [ ] Streaming ingestion
- [ ] Real-time recommendation refresh
- [ ] A/B testing and feedback loops
