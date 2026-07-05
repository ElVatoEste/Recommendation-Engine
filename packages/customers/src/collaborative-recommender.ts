import { jaccard } from "../../similarity/src/index.ts";
import type {
  CustomerRecommendation,
  CustomerSimilarity,
} from "../../shared/src/index.ts";
import type { CustomerProductSet } from "./customer-profile-tracker.ts";

interface Neighbor {
  customerId: string;
  score: number;
  products: Set<string>;
}

/**
 * User-based collaborative filtering over product sets.
 *
 * Neighbors are ranked by Jaccard similarity of purchased products; a product
 * is recommended when similar customers bought it and the target has not. Each
 * candidate's score is the sum of the similarities of the neighbors who bought
 * it, so agreement among close neighbors ranks higher than a single weak match.
 */
export class CollaborativeRecommender {
  getSimilarCustomers(
    targetId: string,
    entries: CustomerProductSet[],
    limit = 10,
  ): CustomerSimilarity[] {
    return this.neighbors(targetId, entries)
      .slice(0, limit)
      .map((neighbor) => ({
        customerId: neighbor.customerId,
        score: Number(neighbor.score.toFixed(4)),
        sharedProducts: this.sharedCount(
          this.targetProducts(targetId, entries),
          neighbor.products,
        ),
      }));
  }

  recommend(
    targetId: string,
    entries: CustomerProductSet[],
    limit = 10,
  ): CustomerRecommendation[] {
    const target = this.targetProducts(targetId, entries);

    if (target.size === 0) {
      return [];
    }

    const neighbors = this.neighbors(targetId, entries);
    const scores = new Map<string, { score: number; supporters: number }>();

    for (const neighbor of neighbors) {
      for (const productId of neighbor.products) {
        if (target.has(productId)) {
          continue;
        }

        const current = scores.get(productId) ?? { score: 0, supporters: 0 };
        current.score += neighbor.score;
        current.supporters += 1;
        scores.set(productId, current);
      }
    }

    return [...scores.entries()]
      .map(([productId, { score, supporters }]) => ({
        productId,
        score: Number(score.toFixed(4)),
        supportingCustomers: supporters,
        reason: `${supporters} cliente(s) con historial similar al tuyo compraron ${productId}.`,
      }))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (right.supportingCustomers !== left.supportingCustomers) {
          return right.supportingCustomers - left.supportingCustomers;
        }

        return left.productId.localeCompare(right.productId);
      })
      .slice(0, limit);
  }

  private neighbors(
    targetId: string,
    entries: CustomerProductSet[],
  ): Neighbor[] {
    const target = this.targetProducts(targetId, entries);

    if (target.size === 0) {
      return [];
    }

    return entries
      .filter((entry) => entry.customerId !== targetId)
      .map((entry) => ({
        customerId: entry.customerId,
        score: jaccard(target, entry.products),
        products: entry.products,
      }))
      .filter((neighbor) => neighbor.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.customerId.localeCompare(right.customerId);
      });
  }

  private targetProducts(
    targetId: string,
    entries: CustomerProductSet[],
  ): Set<string> {
    return (
      entries.find((entry) => entry.customerId === targetId)?.products ??
      new Set<string>()
    );
  }

  private sharedCount(target: Set<string>, other: Set<string>): number {
    let count = 0;
    for (const productId of target) {
      if (other.has(productId)) count += 1;
    }
    return count;
  }
}
