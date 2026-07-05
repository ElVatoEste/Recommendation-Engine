import {
  CollaborativeRecommender,
  CustomerProfileTracker,
} from "../../customers/src/index.ts";
import { RecommendationFeedbackTracker } from "../../feedback/src/index.ts";
import { CoPurchaseGraphTracker } from "../../graph/src/index.ts";
import { HybridRecommender } from "../../hybrid/src/index.ts";
import {
  AssociationRanker,
  PopularProductsRanker,
} from "../../ranking/src/index.ts";
import {
  type AssociationRecommendation,
  type CoPurchaseEdge,
  type CoPurchaseGraph,
  type CustomerProfile,
  type CustomerRecommendation,
  type CustomerSimilarity,
  type EngineSnapshot,
  type EventStore,
  type FeedbackStats,
  type HybridRecommendation,
  type HybridWeights,
  type PopularRecommendation,
  type RecommendationEvent,
  type PurchaseCreatedEvent,
  type TrendStat,
} from "../../shared/src/index.ts";
import { ProductStatisticsTracker } from "../../statistics/src/index.ts";
import { TrendTracker } from "../../trends/src/index.ts";

export class RecommendationEngine {
  private readonly associationRanker = new AssociationRanker();
  private readonly coPurchaseGraph = new CoPurchaseGraphTracker();
  private readonly collaborative = new CollaborativeRecommender();
  private readonly customers = new CustomerProfileTracker();
  private readonly feedback = new RecommendationFeedbackTracker();
  private readonly hybrid = new HybridRecommender();
  private readonly ranker = new PopularProductsRanker();
  private readonly statistics = new ProductStatisticsTracker();
  private readonly trends = new TrendTracker();
  private totalEvents = 0;
  private initialization?: Promise<void>;

  constructor(private readonly eventStore: EventStore) {}

  async initialize(): Promise<void> {
    // Cache the in-flight promise so concurrent callers replay events once.
    this.initialization ??= this.loadFromStore();
    return this.initialization;
  }

  private async loadFromStore(): Promise<void> {
    const events = await this.eventStore.getAll();

    for (const event of events) {
      this.applyEvent(event);
    }

    this.totalEvents = events.length;
  }

  async close(): Promise<void> {
    await this.eventStore.close();
  }

  async ingestEvent(event: RecommendationEvent): Promise<void> {
    await this.initialize();
    await this.eventStore.append(event);
    this.applyEvent(event);
    this.totalEvents += 1;
  }

  async ingestPurchase(event: PurchaseCreatedEvent): Promise<void> {
    await this.ingestEvent(event);
  }

  getPopularProducts(limit = 10): PopularRecommendation[] {
    return this.ranker.rank(this.statistics.getAllProductStats(), limit);
  }

  getCoPurchases(productId: string, limit = 10): CoPurchaseEdge[] {
    return this.coPurchaseGraph.getRelatedProducts(productId, limit);
  }

  getAssociations(
    productId: string,
    limit = 10,
  ): AssociationRecommendation[] {
    return this.associationRanker.rank(
      productId,
      this.getCoPurchases(productId, limit * 3),
      this.statistics.getAllProductStats(),
      this.statistics.getTotalPurchases(),
      limit,
      (targetProductId, sourceProductId) =>
        this.feedback.getFactor(targetProductId, sourceProductId),
    );
  }

  getFeedbackStats(): FeedbackStats[] {
    return this.feedback.getStats();
  }

  getTrends(limit = 10, windowMs?: number): TrendStat[] {
    return this.trends.getTrends(windowMs).slice(0, limit);
  }

  getCustomerProfile(customerId: string): CustomerProfile | undefined {
    return this.customers.getProfile(customerId);
  }

  getAllCustomers(): CustomerProfile[] {
    return this.customers.getAllProfiles();
  }

  getCustomerRecommendations(
    customerId: string,
    limit = 10,
  ): CustomerRecommendation[] {
    return this.collaborative.recommend(
      customerId,
      this.customers.getProductSets(),
      limit,
    );
  }

  getSimilarCustomers(customerId: string, limit = 10): CustomerSimilarity[] {
    return this.collaborative.getSimilarCustomers(
      customerId,
      this.customers.getProductSets(),
      limit,
    );
  }

  /**
   * Hybrid ranking: blends popularity, association, and collaborative signals.
   * When a customer is given, their already-purchased products are excluded and
   * the association signal is aggregated over what they own; without a customer
   * it degrades gracefully to popularity (cold start).
   */
  getHybridRecommendations(
    customerId?: string,
    limit = 10,
    weights?: HybridWeights,
  ): HybridRecommendation[] {
    const owned = new Set(
      customerId
        ? (this.customers.getProfile(customerId)?.products ?? []).map(
            (product) => product.productId,
          )
        : [],
    );

    const stats = this.statistics.getAllProductStats();

    const popularity = new Map<string, number>();
    for (const recommendation of this.ranker.rank(stats, stats.length)) {
      if (!owned.has(recommendation.productId)) {
        popularity.set(recommendation.productId, recommendation.score);
      }
    }

    const association = new Map<string, number>();
    for (const productId of owned) {
      for (const rule of this.getAssociations(productId, limit * 3)) {
        if (owned.has(rule.targetProductId)) {
          continue;
        }
        association.set(
          rule.targetProductId,
          (association.get(rule.targetProductId) ?? 0) + rule.adjustedScore,
        );
      }
    }

    const collaborative = new Map<string, number>();
    if (customerId) {
      for (const rec of this.getCustomerRecommendations(customerId, limit * 3)) {
        collaborative.set(rec.productId, rec.score);
      }
    }

    const trend = new Map<string, number>();
    for (const [productId, score] of this.trends.getTrendScores()) {
      if (!owned.has(productId)) {
        trend.set(productId, score);
      }
    }

    return this.hybrid.compose(
      { popularity, association, collaborative, trend },
      limit,
      weights,
    );
  }

  getGraph(): CoPurchaseGraph {
    const purchaseCounts = new Map(
      this.statistics
        .getAllProductStats()
        .map((stats) => [stats.productId, stats.purchaseCount]),
    );

    return this.coPurchaseGraph.getGraph(purchaseCounts);
  }

  getSnapshot(): EngineSnapshot {
    const productStats = this.statistics.getAllProductStats();

    return {
      totalEvents: this.totalEvents,
      totalPurchases: this.statistics.getTotalPurchases(),
      uniqueProducts: this.statistics.getUniqueProducts(),
      uniqueCustomers: this.customers.getUniqueCustomers(),
      productStats,
    };
  }

  getProductStats(productId: string) {
    return this.statistics.getProductStats(productId);
  }

  private applyEvent(event: RecommendationEvent): void {
    switch (event.type) {
      case "PurchaseCreated":
        this.statistics.registerPurchase(event);
        this.coPurchaseGraph.registerPurchase(event);
        this.customers.registerPurchase(event);
        this.trends.registerPurchase(event);
        return;
      case "RecommendationAccepted":
        this.feedback.registerAccepted(event);
        return;
      case "RecommendationIgnored":
        this.feedback.registerIgnored(event);
        return;
      default:
        return;
    }
  }
}
