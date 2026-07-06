# Recommendation Engine — Web Sandbox

An interactive workbench for the recommendation engine. Feed events into the live
engine and watch every strategy re-rank in real time. Nothing is precomputed: each
ingest hits the API, updates the engine state, and every panel refetches.

Built with React 18, Vite 6, Tailwind CSS v4, Zustand, and React Router.

## Running

The web app is a thin client over the API — start the API first.

```bash
# from the repo root
bun run dev:api     # API on http://localhost:3000
bun run dev:web     # Vite dev server on http://localhost:4173
```

The dev server proxies `/api/*` to `http://localhost:3000`. To point at a different
API, set `VITE_API_URL` (see `.env.example`). With no `DATABASE_URL` the API runs a
fully in-memory store; with one set it persists to PostgreSQL (`bun run db:up`).

Scripts: `dev` · `build` · `preview` · `check` (typecheck) · `lint` · `test`.

## Pages

### Sandbox (`/`)
The primary surface, split into input and output.

- **Feed the engine** — ingest a purchase (customer + line items), record
  recommendation feedback (accepted / ignored), or seed a structured sample dataset
  in one click.
- **Query the engine** — pick a customer or product and compare how each strategy
  ranks it, with the reason behind every result.
- **Event feed** — the live event log over SSE; the newest event flashes as it lands.

### Explorer (`/explorador`)
Deep-dive on a single entity: the co-purchase graph, associations, similar
products/customers, and the hybrid score breakdown.

### Playback (`/laboratorio`)
Steps through real engine events one at a time so you can watch aggregates, the
graph, and the ranking shift at each stage.

## Hybrid weights

The hybrid ranker blends four strategies. In the Sandbox you tune their weights live,
and the weights are remembered **per customer** — so you can boost one shopper and
lower another independently.

| Strategy | What it favours |
| --- | --- |
| Popularity | Global best-sellers, regardless of who the customer is |
| Association | Co-purchase rules ("bought X also bought Y") |
| Collaborative | What similar customers bought |
| Trend | Products accelerating within the trend window |

Weights are sent to `GET /recommendations/hybrid` as `wPop`, `wAssoc`, `wCollab`,
`wTrend`; the blend is normalized, so only the ratio between them matters.

## Project layout

```
src/
  components/   Panels, forms, ranked lists, graph, workbench shell
  pages/        Sandbox, Explorer, Playback
  hooks/        useAsyncData, useEventStream (SSE), useSimulationPlayer
  lib/          api client (typed), contracts, formatting, graph layout
  store/        Zustand store (selection, live snapshot, revision)
```

`revision` in the store bumps on every ingested event; query panels use it as a
refetch key, which is how the whole UI stays in sync with the live engine.

## Design

Dark, data-dense "cockpit" styling: near-black surfaces with hairline separation,
tabular-figure numbers, one UI accent, and a small categorical palette reserved for
the four strategy series. Motion is restrained and motivated — entrance reveals, a
flash on the row the engine just changed, and score bars that grow to their value.
Everything honours `prefers-reduced-motion`.
