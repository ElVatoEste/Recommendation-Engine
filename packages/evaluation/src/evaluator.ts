import {
  CollaborativeRecommender,
  type CustomerProductSet,
} from "../../customers/src/index.ts";
import { ProductEmbeddingIndex } from "../../embeddings/src/index.ts";
import type {
  CoPurchaseGraph,
  EvaluationReport,
  EvaluationStrategyResult,
} from "../../shared/src/index.ts";

export interface EvaluationInput {
  customerSets: CustomerProductSet[];
  popularityOrder: string[];
  graph: CoPurchaseGraph;
  k: number;
}

type RankFn = (
  customerId: string,
  keptProducts: Set<string>,
) => string[];

interface Accumulator {
  hits: number;
  reciprocalRank: number;
  folds: number;
}

/**
 * Offline leave-one-out benchmark.
 *
 * For every customer with at least two products, the least popular product is
 * hidden and each strategy must rank it back from the remaining ones. Reported
 * metrics are hit-rate@k, MRR, and precision@k averaged over folds.
 *
 * Caveat: the popularity ranking, co-purchase graph, and neighbor sets are
 * built from the full history, so there is mild train/test leakage. It is
 * applied identically to every strategy, so the comparison stays fair; this is
 * a methodology harness, not a leakage-free research result.
 */
export class Evaluator {
  private readonly collaborative = new CollaborativeRecommender();

  evaluate(input: EvaluationInput): EvaluationReport {
    const embeddingIndex = new ProductEmbeddingIndex(input.graph);
    const setById = new Map(
      input.customerSets.map((entry) => [entry.customerId, entry.products]),
    );

    const strategies: Record<string, RankFn> = {
      popular: (_customerId, kept) =>
        input.popularityOrder.filter((productId) => !kept.has(productId)),

      collaborative: (customerId, kept) =>
        this.collaborative
          .recommend(customerId, this.withReducedSet(input.customerSets, customerId, kept))
          .map((recommendation) => recommendation.productId),

      embedding: (_customerId, kept) =>
        embeddingIndex
          .recommendForProducts([...kept])
          .map((recommendation) => recommendation.productId),

      hybrid: (customerId, kept) =>
        this.blend(
          input.popularityOrder.filter((productId) => !kept.has(productId)),
          this.collaborative
            .recommend(customerId, this.withReducedSet(input.customerSets, customerId, kept))
            .map((r) => r.productId),
          embeddingIndex.recommendForProducts([...kept]).map((r) => r.productId),
          input.k,
        ),
    };

    const accumulators = new Map<string, Accumulator>(
      Object.keys(strategies).map((name) => [
        name,
        { hits: 0, reciprocalRank: 0, folds: 0 },
      ]),
    );

    let customersEvaluated = 0;

    for (const [customerId, products] of setById) {
      if (products.size < 2) {
        continue;
      }

      const heldOut = this.leastPopular(products, input.popularityOrder);
      if (!heldOut) continue;

      const kept = new Set(products);
      kept.delete(heldOut);
      customersEvaluated += 1;

      for (const [name, rank] of Object.entries(strategies)) {
        const ranked = rank(customerId, kept).slice(0, input.k);
        const position = ranked.indexOf(heldOut);
        const accumulator = accumulators.get(name)!;
        accumulator.folds += 1;
        if (position >= 0) {
          accumulator.hits += 1;
          accumulator.reciprocalRank += 1 / (position + 1);
        }
      }
    }

    const results: EvaluationStrategyResult[] = [...accumulators.entries()]
      .map(([strategy, acc]) => ({
        strategy,
        hitRate: ratio(acc.hits, acc.folds),
        mrr: ratio(acc.reciprocalRank, acc.folds),
        precision: ratio(acc.hits, acc.folds * input.k),
      }))
      .sort((left, right) => right.hitRate - left.hitRate || right.mrr - left.mrr);

    return { k: input.k, customersEvaluated, strategies: results };
  }

  private withReducedSet(
    customerSets: CustomerProductSet[],
    customerId: string,
    kept: Set<string>,
  ): CustomerProductSet[] {
    return customerSets.map((entry) =>
      entry.customerId === customerId
        ? { customerId, products: kept }
        : entry,
    );
  }

  private leastPopular(
    products: Set<string>,
    popularityOrder: string[],
  ): string | undefined {
    let worst: string | undefined;
    let worstRank = -1;

    for (const productId of products) {
      const rank = popularityOrder.indexOf(productId);
      const effectiveRank = rank === -1 ? popularityOrder.length : rank;
      if (effectiveRank > worstRank) {
        worstRank = effectiveRank;
        worst = productId;
      }
    }

    return worst;
  }

  private blend(
    popular: string[],
    collaborative: string[],
    embedding: string[],
    k: number,
  ): string[] {
    const scores = new Map<string, number>();

    for (const ranking of [popular, collaborative, embedding]) {
      const length = ranking.length || 1;
      ranking.forEach((productId, index) => {
        // Rank-based reciprocal contribution, equal weight per strategy.
        const contribution = (length - index) / length;
        scores.set(productId, (scores.get(productId) ?? 0) + contribution);
      });
    }

    return [...scores.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, k)
      .map(([productId]) => productId);
  }
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}
