import type {
  CustomerProfile,
  PurchaseCreatedEvent,
} from "../../shared/src/index.ts";

interface MutableProfile {
  products: Map<string, number>;
  orderCount: number;
  totalSpend: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface CustomerProductSet {
  customerId: string;
  products: Set<string>;
}

export class CustomerProfileTracker {
  private readonly profiles = new Map<string, MutableProfile>();

  registerPurchase(event: PurchaseCreatedEvent): void {
    // Purchases without a customer are anonymous and cannot be segmented.
    if (!event.customerId) {
      return;
    }

    const profile = this.profiles.get(event.customerId) ?? {
      products: new Map<string, number>(),
      orderCount: 0,
      totalSpend: 0,
      firstSeenAt: event.occurredAt,
      lastSeenAt: event.occurredAt,
    };

    profile.orderCount += 1;
    profile.lastSeenAt = event.occurredAt;
    if (event.occurredAt < profile.firstSeenAt) {
      profile.firstSeenAt = event.occurredAt;
    }

    for (const item of event.items) {
      profile.products.set(
        item.productId,
        (profile.products.get(item.productId) ?? 0) + 1,
      );
      profile.totalSpend += item.quantity * (item.unitPrice ?? 0);
    }

    this.profiles.set(event.customerId, profile);
  }

  getUniqueCustomers(): number {
    return this.profiles.size;
  }

  getProductSet(customerId: string): Set<string> {
    return new Set(this.profiles.get(customerId)?.products.keys());
  }

  getProductSets(): CustomerProductSet[] {
    return [...this.profiles.entries()].map(([customerId, profile]) => ({
      customerId,
      products: new Set(profile.products.keys()),
    }));
  }

  getProfile(customerId: string): CustomerProfile | undefined {
    const profile = this.profiles.get(customerId);
    return profile ? this.toProfile(customerId, profile) : undefined;
  }

  getAllProfiles(): CustomerProfile[] {
    return [...this.profiles.entries()]
      .map(([customerId, profile]) => this.toProfile(customerId, profile))
      .sort((left, right) => {
        if (right.orderCount !== left.orderCount) {
          return right.orderCount - left.orderCount;
        }

        return left.customerId.localeCompare(right.customerId);
      });
  }

  private toProfile(
    customerId: string,
    profile: MutableProfile,
  ): CustomerProfile {
    const products = [...profile.products.entries()]
      .map(([productId, purchaseCount]) => ({ productId, purchaseCount }))
      .sort((left, right) => {
        if (right.purchaseCount !== left.purchaseCount) {
          return right.purchaseCount - left.purchaseCount;
        }

        return left.productId.localeCompare(right.productId);
      });

    return {
      customerId,
      orderCount: profile.orderCount,
      totalSpend: Number(profile.totalSpend.toFixed(2)),
      uniqueProducts: products.length,
      products,
      firstSeenAt: profile.firstSeenAt,
      lastSeenAt: profile.lastSeenAt,
    };
  }
}
