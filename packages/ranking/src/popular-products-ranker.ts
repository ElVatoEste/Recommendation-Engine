import type {
  PopularRecommendation,
  ProductStats,
} from "../../shared/src/index.ts";

export class PopularProductsRanker {
  rank(stats: ProductStats[], limit = 10): PopularRecommendation[] {
    return stats.slice(0, limit).map((product, index) => ({
      productId: product.productId,
      score: this.calculateScore(product),
      reason: `Producto popular #${index + 1} por frecuencia de compra y volumen vendido.`,
      stats: product,
    }));
  }

  private calculateScore(product: ProductStats): number {
    return Number(
      (product.purchaseCount * 100 + product.quantitySold * 10 + product.revenue)
        .toFixed(2),
    );
  }
}
