import type {
  HybridComponents,
  HybridRecommendation,
  HybridWeights,
} from "../../shared/src/index.ts";

export type HybridSignals = Record<keyof HybridComponents, Map<string, number>>;

const COMPONENTS: Array<keyof HybridComponents> = [
  "popularity",
  "association",
  "collaborative",
  "trend",
];

export const DEFAULT_WEIGHTS: HybridWeights = {
  popularity: 0.15,
  association: 0.3,
  collaborative: 0.35,
  trend: 0.2,
};

const COMPONENT_LABELS: Record<keyof HybridComponents, string> = {
  popularity: "popularidad general",
  association: "asociacion de compra",
  collaborative: "clientes similares a ti",
  trend: "tendencia reciente",
};

/**
 * Blends independent recommendation signals into a single explainable score.
 *
 * Each signal has its own scale, so every signal is min-max normalized to
 * [0, 1] before weighting. Weights are normalized to sum to 1, so the final
 * score also lands in [0, 1] and the per-component contributions explain why a
 * product surfaced.
 */
export class HybridRecommender {
  compose(
    signals: HybridSignals,
    limit = 10,
    weights: HybridWeights = DEFAULT_WEIGHTS,
  ): HybridRecommendation[] {
    const w = normalizeWeights(weights);
    const maxima = Object.fromEntries(
      COMPONENTS.map((key) => [key, maxValue(signals[key])]),
    ) as Record<keyof HybridComponents, number>;

    const candidates = new Set<string>();
    for (const key of COMPONENTS) {
      for (const productId of signals[key].keys()) {
        candidates.add(productId);
      }
    }

    return [...candidates]
      .map((productId) => {
        const components = {} as HybridComponents;
        const contributions = {} as HybridComponents;
        let score = 0;

        for (const key of COMPONENTS) {
          const value = normalize(signals[key].get(productId), maxima[key]);
          components[key] = Number(value.toFixed(4));
          contributions[key] = value * w[key];
          score += contributions[key];
        }

        return {
          productId,
          score: Number(score.toFixed(4)),
          components,
          reason: buildReason(contributions),
        } satisfies HybridRecommendation;
      })
      .filter((recommendation) => recommendation.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.productId.localeCompare(right.productId);
      })
      .slice(0, limit);
  }
}

function normalizeWeights(weights: HybridWeights): HybridWeights {
  const total = COMPONENTS.reduce((sum, key) => sum + (weights[key] ?? 0), 0);

  if (total <= 0) {
    return DEFAULT_WEIGHTS;
  }

  return {
    popularity: (weights.popularity ?? 0) / total,
    association: (weights.association ?? 0) / total,
    collaborative: (weights.collaborative ?? 0) / total,
    trend: (weights.trend ?? 0) / total,
  };
}

function maxValue(map: Map<string, number>): number {
  let max = 0;
  for (const value of map.values()) {
    if (value > max) max = value;
  }
  return max;
}

function normalize(value: number | undefined, max: number): number {
  if (!value || max <= 0) return 0;
  return value / max;
}

function buildReason(contributions: HybridComponents): string {
  let dominantKey: keyof HybridComponents = "popularity";
  let dominantValue = -1;

  for (const key of COMPONENTS) {
    if (contributions[key] > dominantValue) {
      dominantValue = contributions[key];
      dominantKey = key;
    }
  }

  if (dominantValue <= 0) {
    return "Recomendacion combinada.";
  }

  return `Impulsado principalmente por ${COMPONENT_LABELS[dominantKey]}.`;
}
