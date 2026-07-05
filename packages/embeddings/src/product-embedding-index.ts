import type {
  CoPurchaseGraph,
  EmbeddingRecommendation,
  ProductSimilarity,
} from "../../shared/src/index.ts";

type Vector = Map<string, number>;

/**
 * Co-occurrence product embeddings.
 *
 * Every product is represented by its vector of co-purchase weights with other
 * products (a row of the co-purchase matrix). Cosine similarity over these
 * vectors captures second-order similarity: two products are alike when they
 * appear in similar baskets, even if they were never bought together. This is a
 * distributed, first-principles embedding with no training loop or randomness.
 */
export class ProductEmbeddingIndex {
  private readonly vectors = new Map<string, Vector>();
  private readonly norms = new Map<string, number>();

  constructor(graph: CoPurchaseGraph) {
    for (const edge of graph.edges) {
      this.addWeight(edge.source, edge.target, edge.weight);
      this.addWeight(edge.target, edge.source, edge.weight);
    }

    for (const [productId, vector] of this.vectors) {
      this.norms.set(productId, norm(vector));
    }
  }

  get size(): number {
    return this.vectors.size;
  }

  similar(productId: string, limit = 10): ProductSimilarity[] {
    const base = this.vectors.get(productId);
    const baseNorm = this.norms.get(productId);

    if (!base || !baseNorm) {
      return [];
    }

    return [...this.vectors.keys()]
      .filter((candidate) => candidate !== productId)
      .map((candidate) => ({
        productId: candidate,
        score: Number(
          (
            dot(base, this.vectors.get(candidate)!) /
            (baseNorm * this.norms.get(candidate)!)
          ).toFixed(4),
        ),
        reason: `Aparece en contextos de compra similares a ${productId}.`,
      }))
      .filter((similarity) => similarity.score > 0)
      .sort(byScoreThenId)
      .slice(0, limit);
  }

  /**
   * ML-assisted scoring: builds a taste centroid from the products a customer
   * already owns and ranks other products by cosine proximity to it.
   */
  recommendForProducts(
    ownedProductIds: string[],
    limit = 10,
  ): EmbeddingRecommendation[] {
    const owned = new Set(ownedProductIds);
    const centroid: Vector = new Map();

    for (const productId of owned) {
      const vector = this.vectors.get(productId);
      if (!vector) continue;
      for (const [key, value] of vector) {
        centroid.set(key, (centroid.get(key) ?? 0) + value);
      }
    }

    const centroidNorm = norm(centroid);
    if (centroidNorm === 0) {
      return [];
    }

    return [...this.vectors.keys()]
      .filter((productId) => !owned.has(productId))
      .map((productId) => ({
        productId,
        score: Number(
          (
            dot(centroid, this.vectors.get(productId)!) /
            (centroidNorm * this.norms.get(productId)!)
          ).toFixed(4),
        ),
        reason: "Encaja con el perfil de productos que ya compraste.",
      }))
      .filter((recommendation) => recommendation.score > 0)
      .sort(byScoreThenId)
      .slice(0, limit);
  }

  scoreMap(ownedProductIds: string[]): Map<string, number> {
    return new Map(
      this.recommendForProducts(ownedProductIds, this.vectors.size).map(
        (recommendation) => [recommendation.productId, recommendation.score],
      ),
    );
  }

  private addWeight(source: string, target: string, weight: number): void {
    const vector = this.vectors.get(source) ?? new Map<string, number>();
    vector.set(target, (vector.get(target) ?? 0) + weight);
    this.vectors.set(source, vector);
  }
}

function dot(a: Vector, b: Vector): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let sum = 0;
  for (const [key, value] of small) {
    const other = large.get(key);
    if (other !== undefined) {
      sum += value * other;
    }
  }
  return sum;
}

function norm(vector: Vector): number {
  let sum = 0;
  for (const value of vector.values()) {
    sum += value * value;
  }
  return Math.sqrt(sum);
}

function byScoreThenId(
  left: { productId: string; score: number },
  right: { productId: string; score: number },
): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  return left.productId.localeCompare(right.productId);
}
