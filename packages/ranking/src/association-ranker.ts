import type {
  AssociationRecommendation,
  CoPurchaseEdge,
  ProductStats,
} from "../../shared/src/index.ts";

export class AssociationRanker {
  rank(
    sourceProductId: string,
    coPurchases: CoPurchaseEdge[],
    productStats: ProductStats[],
    totalPurchases: number,
    limit = 10,
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

        return {
          sourceProductId,
          targetProductId: edge.relatedProductId,
          coPurchaseCount: edge.coPurchaseCount,
          support: Number(support.toFixed(4)),
          confidence: Number(confidence.toFixed(4)),
          lift: Number(lift.toFixed(4)),
          reason: `Clientes que compran ${sourceProductId} tambien compran ${edge.relatedProductId}.`,
        } satisfies AssociationRecommendation;
      })
      .filter((recommendation): recommendation is AssociationRecommendation =>
        recommendation !== null,
      )
      .sort((left, right) => {
        if (right.lift !== left.lift) {
          return right.lift - left.lift;
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
