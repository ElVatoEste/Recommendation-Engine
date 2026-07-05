import type {
  CoPurchaseEdge,
  PurchaseCreatedEvent,
} from "../../shared/src/index.ts";

function sortPair(left: string, right: string): [string, string] {
  return left.localeCompare(right) <= 0 ? [left, right] : [right, left];
}

export class CoPurchaseGraphTracker {
  private readonly adjacency = new Map<string, Map<string, number>>();

  registerPurchase(event: PurchaseCreatedEvent): void {
    const productIds = [...new Set(event.items.map((item) => item.productId))];

    for (let index = 0; index < productIds.length; index += 1) {
      for (let nestedIndex = index + 1; nestedIndex < productIds.length; nestedIndex += 1) {
        const [left, right] = sortPair(productIds[index], productIds[nestedIndex]);

        this.incrementEdge(left, right);
        this.incrementEdge(right, left);
      }
    }
  }

  getRelatedProducts(productId: string, limit = 10): CoPurchaseEdge[] {
    const neighbors = this.adjacency.get(productId);

    if (!neighbors) {
      return [];
    }

    return [...neighbors.entries()]
      .map(([relatedProductId, coPurchaseCount]) => ({
        productId,
        relatedProductId,
        coPurchaseCount,
      }))
      .sort((left, right) => {
        if (right.coPurchaseCount !== left.coPurchaseCount) {
          return right.coPurchaseCount - left.coPurchaseCount;
        }

        return left.relatedProductId.localeCompare(right.relatedProductId);
      })
      .slice(0, limit);
  }

  private incrementEdge(sourceProductId: string, targetProductId: string): void {
    const neighbors = this.adjacency.get(sourceProductId) ?? new Map<string, number>();
    const current = neighbors.get(targetProductId) ?? 0;

    neighbors.set(targetProductId, current + 1);
    this.adjacency.set(sourceProductId, neighbors);
  }
}
