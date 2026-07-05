import type {
  ExperimentConfig,
  ExperimentReport,
  ExperimentVariant,
} from "../../shared/src/index.ts";

interface Counts {
  impressions: number;
  acceptances: number;
}

/** Deterministic FNV-1a hash mapped to [0, 1) for stable bucketing. */
function hashFraction(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) % 1_000_000) / 1_000_000;
}

/**
 * A/B testing registry.
 *
 * Customers are bucketed into variants deterministically (a hash of the
 * experiment and customer id), so the same customer always sees the same
 * variant with no stored assignment. Outcomes flow in from recommendation
 * feedback, and the report exposes the best-converting variant — the basis for
 * online strategy selection.
 */
export class ExperimentRegistry {
  private readonly configs = new Map<string, ExperimentConfig>();
  private readonly outcomes = new Map<string, Map<string, Counts>>();

  define(config: ExperimentConfig): void {
    if (config.variants.length === 0) {
      throw new Error("An experiment needs at least one variant.");
    }
    this.configs.set(config.id, config);
    if (!this.outcomes.has(config.id)) {
      this.outcomes.set(config.id, new Map());
    }
  }

  list(): ExperimentConfig[] {
    return [...this.configs.values()];
  }

  get(experimentId: string): ExperimentConfig | undefined {
    return this.configs.get(experimentId);
  }

  assign(experimentId: string, customerId: string): ExperimentVariant | undefined {
    const config = this.configs.get(experimentId);
    if (!config) {
      return undefined;
    }

    const total = config.variants.reduce(
      (sum, variant) => sum + Math.max(0, variant.allocation),
      0,
    );
    if (total <= 0) {
      return config.variants[0];
    }

    const point = hashFraction(`${experimentId}:${customerId}`);
    let cumulative = 0;

    for (const variant of config.variants) {
      cumulative += Math.max(0, variant.allocation) / total;
      if (point < cumulative) {
        return variant;
      }
    }

    return config.variants[config.variants.length - 1];
  }

  recordOutcome(
    experimentId: string,
    variantId: string,
    accepted: boolean,
  ): void {
    if (!this.configs.has(experimentId)) {
      return;
    }

    const perVariant = this.outcomes.get(experimentId)!;
    const counts = perVariant.get(variantId) ?? { impressions: 0, acceptances: 0 };
    counts.impressions += 1;
    if (accepted) {
      counts.acceptances += 1;
    }
    perVariant.set(variantId, counts);
  }

  report(experimentId: string): ExperimentReport | undefined {
    const config = this.configs.get(experimentId);
    if (!config) {
      return undefined;
    }

    const perVariant = this.outcomes.get(experimentId) ?? new Map();

    const variants = config.variants.map((variant) => {
      const counts = perVariant.get(variant.id) ?? {
        impressions: 0,
        acceptances: 0,
      };
      const acceptanceRate =
        counts.impressions === 0
          ? 0
          : Number((counts.acceptances / counts.impressions).toFixed(4));

      return {
        variantId: variant.id,
        impressions: counts.impressions,
        acceptances: counts.acceptances,
        acceptanceRate,
      };
    });

    // Best variant requires at least one impression to avoid rewarding silence.
    const ranked = variants
      .filter((variant) => variant.impressions > 0)
      .sort((left, right) => right.acceptanceRate - left.acceptanceRate);

    return {
      experimentId,
      variants,
      bestVariant: ranked[0]?.variantId,
    };
  }
}
