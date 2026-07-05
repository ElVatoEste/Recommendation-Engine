# Vision

A recommendation engine built from first principles, starting with plain statistics
and growing — one deliberate layer at a time — into a system that learns from behavior
and explains every recommendation it makes.

## Why build it this way

Most recommendation systems arrive as black boxes, or start deep in the machine-learning
stack before the basics are understood. This project takes the opposite path: begin with
explicit events and transparent statistics, then evolve toward relationships, similarity,
collaborative filtering, and hybrid scoring.

The point is not to reach "AI" as fast as possible. It is to build each layer
independently and understand why it exists.

```
Statistics
  -> Association Rules
  -> Product Graph
  -> Collaborative Filtering
  -> Machine Learning
  -> Hybrid Recommendation System
```

## Core idea

The engine learns continuously from events. When a customer buys bread, milk, and eggs,
the engine records those relationships. After thousands of purchases, patterns emerge:

```
bread
  |-- milk    (845)
  |-- butter  (302)
  |-- cheese  (217)
  |-- ham     (190)
```

Every new purchase reinforces or weakens an edge. No retraining is needed in the early
stages — the model evolves as data arrives:

```
purchase -> extract relations -> update statistics -> update graph -> recompute scores
```

## Recommendation strategies

The architecture lets multiple strategies coexist.

- **Popular products** — most frequently purchased items; good for cold start and new users.
- **Association rules** — "customers who bought X also bought Y", measured with support,
  confidence, and lift (Apriori, FP-Growth, ECLAT).
- **Product similarity** — Jaccard, cosine, or Pearson correlation between products.
- **Product graph** — purchases as a weighted graph; each co-purchase increases an edge.
- **Collaborative filtering** — recommend based on customers with similar histories.
- **Hybrid engine** — a weighted blend: popularity + association + similarity + user
  preference + seasonality + trend.

## Explainable recommendations

Recommendations should always carry a reason. Instead of "Recommended: Milk", the engine
provides context:

- 81% of customers who bought bread also bought milk.
- Customers with a history similar to yours frequently buy this product.
- This product is up 42% in popularity over the last 30 days.

Explainability is a first-class feature, not an afterthought.

## Feedback loop

The system also learns from its own recommendations. Accepted recommendations reinforce a
score; ignored ones reduce a weight. Over time this produces a continuously improving engine.

## Event-driven core

The engine is event-driven. Supported event types:

`PurchaseCreated`, `ProductViewed`, `ProductClicked`, `RecommendationAccepted`,
`RecommendationIgnored`, `CartAbandoned`, `WishlistAdded`, `WishlistRemoved`, `ProductRated`.

## Architecture

```
API
  -> Recommendation Service
       -> Learning Engine  -> Product Graph -> Statistics -> Event Processor -> Event Store
       -> Query Engine     -> Ranking Engine
```

## Roadmap

- **Phase 1 — Foundation:** event ingestion, storage, product statistics, popular products.
- **Phase 2 — Relationships:** product graph, association rules, similarity.
- **Phase 3 — Personalization:** collaborative filtering, ranking composition, explanations.
- **Phase 4 — Hybrid intelligence:** embeddings, ML-assisted and hybrid scoring.
- **Phase 5 — Production:** streaming ingestion, real-time refresh, A/B testing, online learning.

See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed status.

## Applications

The engine is intentionally domain-agnostic: e-commerce, grocery and retail, streaming and
media, news, learning platforms, music and video, hospitality, financial products,
healthcare, and inventory optimization.

## Guiding principles

Modular architecture. Explainability over opacity. Event-driven design. Algorithm-first
evolution. Extensible by design. Technology-agnostic. Continuous learning. Reproducible
experiments.
