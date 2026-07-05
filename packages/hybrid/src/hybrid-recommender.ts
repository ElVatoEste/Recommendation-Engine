import type {
  HybridComponents,
  HybridRecommendation,
  HybridWeights,
} from "../../shared/src/index.ts";

export interface HybridSignals {
  popularity: Map<string, number>;
  association: Map<string, number>;
  collaborative: Map<string, number>;
}

export const DEFAULT_WEIGHTS: HybridWeights = {
  popularity: 0.2,
  association: 0.4,
  collaborative: 0.4,
};

const COMPONENT_LABELS: Record<keyof HybridComponents, string> = {
  popularity: "popularidad general",
  association: "asociacion de compra",
  collaborative: "clientes similares a ti",
};

/**
 * Blends independent recommendation signals into a single explainable score.
 *
 * Each signal has its own scale (popularity is a large integer-ish score,
 * association is a lift-derived value, collaborative is a sum of similarities),
 * so every signal is min-max normalized to [0, 1] before weighting. Weights are
 * normalized to sum to 1, so the final score also lands in [0, 1] and the
 * per-component contributions explain why a product surfaced.
 */
export class HybridRecommender {
  compose(
    signals: HybridSignals,
    limit = 10,
    weights: HybridWeights = DEFAULT_WEIGHTS,
  ): HybridRecommendation[] {
    const w = normalizeWeights(weights);
    const maxPopularity = maxValue(signals.popularity);
    const maxAssociation = maxValue(signals.association);
    const maxCollaborative = maxValue(signals.collaborative);

    const candidates = new Set<string>([
      ...signals.popularity.keys(),
      ...signals.association.keys(),
      ...signals.collaborative.keys(),
    ]);

    return [...candidates]
      .map((productId) => {
        const components: HybridComponents = {
          popularity: normalize(signals.popularity.get(productId), maxPopularity),
          association: normalize(signals.association.get(productId), maxAssociation),
          collaborative: normalize(
            signals.collaborative.get(productId),
            maxCollaborative,
          ),
        };

        const contributions = {
          popularity: components.popularity * w.popularity,
          association: components.association * w.association,
          collaborative: components.collaborative * w.collaborative,
        };

        const score =
          contributions.popularity +
          contributions.association +
          contributions.collaborative;

        return {
          productId,
          score: Number(score.toFixed(4)),
          components: {
            popularity: Number(components.popularity.toFixed(4)),
            association: Number(components.association.toFixed(4)),
            collaborative: Number(components.collaborative.toFixed(4)),
          },
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
  const total =
    weights.popularity + weights.association + weights.collaborative;

  if (total <= 0) {
    return DEFAULT_WEIGHTS;
  }

  return {
    popularity: weights.popularity / total,
    association: weights.association / total,
    collaborative: weights.collaborative / total,
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
  const entries = Object.entries(contributions) as Array<
    [keyof HybridComponents, number]
  >;

  const dominant = entries.reduce((best, current) =>
    current[1] > best[1] ? current : best,
  );

  if (dominant[1] <= 0) {
    return "Recomendacion combinada.";
  }

  return `Impulsado principalmente por ${COMPONENT_LABELS[dominant[0]]}.`;
}
