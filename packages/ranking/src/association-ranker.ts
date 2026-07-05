import type {
  AssociationRecommendation,
  CoPurchaseEdge,
  ProductStats,
} from "../../shared/src/index.ts";

/**
 * Returns a feedback multiplier (centered at 1.0) for a source -> target
 * recommendation. Defaults to neutral when no feedback provider is supplied.
 */
export type FeedbackFactorProvider = (
  targetProductId: string,
  sourceProductId: string,
) => number;

export class AssociationRanker {
  rank(
    sourceProductId: string,
    coPurchases: CoPurchaseEdge[],
    productStats: ProductStats[],
    totalPurchases: number,
    limit = 10,
    feedbackFactor: FeedbackFactorProvider = () => 1,
  ): AssociationRecommendation[] {
    const statsByProduct = new Map(
      productStats.map((stats) => [stats.productId, stats]),
    );
    const sourceStats = statsByProduct.get(sourceProductId);

    if (!sourceStats || sourceStats.purchaseCount === 0 || totalPurchases === 0) {
      return [];
    }

    return coPurchases
      .map((edge) => {
        const targetStats = statsByProduct.get(edge.relatedProductId);

        if (!targetStats || targetStats.purchaseCount === 0) {
          return null;
        }

        const support = edge.coPurchaseCount / totalPurchases;
        const confidence = edge.coPurchaseCount / sourceStats.purchaseCount;
        const targetProbability = targetStats.purchaseCount / totalPurchases;
        const lift = targetProbability === 0 ? 0 : confidence / targetProbability;
        const factor = feedbackFactor(edge.relatedProductId, sourceProductId);
        const adjustedScore = lift * factor;

        return {
          sourceProductId,
          targetProductId: edge.relatedProductId,
          coPurchaseCount: edge.coPurchaseCount,
          support: Number(support.toFixed(4)),
          confidence: Number(confidence.toFixed(4)),
          lift: Number(lift.toFixed(4)),
          feedbackFactor: Number(factor.toFixed(4)),
          adjustedScore: Number(adjustedScore.toFixed(4)),
          reason: buildReason(sourceProductId, edge.relatedProductId, factor),
        } satisfies AssociationRecommendation;
      })
      .filter((recommendation): recommendation is AssociationRecommendation =>
        recommendation !== null,
      )
      .sort((left, right) => {
        if (right.adjustedScore !== left.adjustedScore) {
          return right.adjustedScore - left.adjustedScore;
        }

        if (right.confidence !== left.confidence) {
          return right.confidence - left.confidence;
        }

        if (right.coPurchaseCount !== left.coPurchaseCount) {
          return right.coPurchaseCount - left.coPurchaseCount;
        }

        return left.targetProductId.localeCompare(right.targetProductId);
      })
      .slice(0, limit);
  }
}

function buildReason(
  sourceProductId: string,
  targetProductId: string,
  factor: number,
): string {
  const base = `Clientes que compran ${sourceProductId} tambien compran ${targetProductId}.`;

  if (factor > 1) {
    return `${base} Reforzado por feedback positivo de recomendaciones.`;
  }

  if (factor < 1) {
    return `${base} Atenuado por feedback negativo de recomendaciones.`;
  }

  return base;
}
