import type {
  ProductStats,
  PurchaseCreatedEvent,
} from "../../shared/src/index.ts";

export class ProductStatisticsTracker {
  private readonly statsByProduct = new Map<string, ProductStats>();
  private totalPurchases = 0;

  registerPurchase(event: PurchaseCreatedEvent): void {
    this.totalPurchases += 1;

    for (const item of event.items) {
      const current = this.statsByProduct.get(item.productId) ?? {
        productId: item.productId,
        purchaseCount: 0,
        quantitySold: 0,
        revenue: 0,
      };

      current.purchaseCount += 1;
      current.quantitySold += item.quantity;
      current.revenue += item.quantity * (item.unitPrice ?? 0);
      current.lastPurchasedAt = event.occurredAt;

      this.statsByProduct.set(item.productId, current);
    }
  }

  getTotalPurchases(): number {
    return this.totalPurchases;
  }

  getUniqueProducts(): number {
    return this.statsByProduct.size;
  }

  getProductStats(productId: string): ProductStats | undefined {
    const stats = this.statsByProduct.get(productId);
    return stats ? { ...stats } : undefined;
  }

  getAllProductStats(): ProductStats[] {
    return [...this.statsByProduct.values()]
      .map((stats) => ({ ...stats }))
      .sort((left, right) => {
        if (right.purchaseCount !== left.purchaseCount) {
          return right.purchaseCount - left.purchaseCount;
        }

        if (right.quantitySold !== left.quantitySold) {
          return right.quantitySold - left.quantitySold;
        }

        return left.productId.localeCompare(right.productId);
      });
  }
}
