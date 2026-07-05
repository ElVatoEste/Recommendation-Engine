import { RecommendationFeedbackTracker } from "../../feedback/src/index.ts";
import { CoPurchaseGraphTracker } from "../../graph/src/index.ts";
import {
  AssociationRanker,
  PopularProductsRanker,
} from "../../ranking/src/index.ts";
import {
  type AssociationRecommendation,
  type CoPurchaseEdge,
  type EngineSnapshot,
  type EventStore,
  type FeedbackStats,
  type PopularRecommendation,
  type RecommendationEvent,
  type PurchaseCreatedEvent,
} from "../../shared/src/index.ts";
import { ProductStatisticsTracker } from "../../statistics/src/index.ts";

export class RecommendationEngine {
  private readonly associationRanker = new AssociationRanker();
  private readonly coPurchaseGraph = new CoPurchaseGraphTracker();
  private readonly feedback = new RecommendationFeedbackTracker();
  private readonly ranker = new PopularProductsRanker();
  private readonly statistics = new ProductStatisticsTracker();
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

  getSnapshot(): EngineSnapshot {
    const productStats = this.statistics.getAllProductStats();

    return {
      totalEvents: this.totalEvents,
      totalPurchases: this.statistics.getTotalPurchases(),
      uniqueProducts: this.statistics.getUniqueProducts(),
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
