export type RecommendationEventType =
  | "PurchaseCreated"
  | "ProductViewed"
  | "ProductClicked"
  | "RecommendationAccepted"
  | "RecommendationIgnored"
  | "CartAbandoned"
  | "WishlistAdded"
  | "WishlistRemoved"
  | "ProductRated";

export interface EventMetadata {
  source?: string;
  correlationId?: string;
  [key: string]: string | undefined;
}

export interface RecommendationEventBase {
  id: string;
  type: RecommendationEventType;
  occurredAt: string;
  customerId?: string;
  metadata?: EventMetadata;
}

export interface PurchaseItem {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface ProductScopedEvent extends RecommendationEventBase {
  productId: string;
}

export interface PurchaseCreatedEvent extends RecommendationEventBase {
  type: "PurchaseCreated";
  orderId: string;
  items: PurchaseItem[];
}

export interface ProductViewedEvent extends ProductScopedEvent {
  type: "ProductViewed";
}

export interface ProductClickedEvent extends ProductScopedEvent {
  type: "ProductClicked";
}

export interface WishlistAddedEvent extends ProductScopedEvent {
  type: "WishlistAdded";
}

export interface WishlistRemovedEvent extends ProductScopedEvent {
  type: "WishlistRemoved";
}

export interface ProductRatedEvent extends ProductScopedEvent {
  type: "ProductRated";
  rating: number;
}

export interface RecommendationFeedbackEvent extends RecommendationEventBase {
  recommendationProductId: string;
  sourceProductId?: string;
}

export interface RecommendationAcceptedEvent extends RecommendationFeedbackEvent {
  type: "RecommendationAccepted";
}

export interface RecommendationIgnoredEvent extends RecommendationFeedbackEvent {
  type: "RecommendationIgnored";
}

export interface CartAbandonedEvent extends RecommendationEventBase {
  type: "CartAbandoned";
  items: PurchaseItem[];
}

export type RecommendationEvent =
  | PurchaseCreatedEvent
  | ProductViewedEvent
  | ProductClickedEvent
  | RecommendationAcceptedEvent
  | RecommendationIgnoredEvent
  | CartAbandonedEvent
  | WishlistAddedEvent
  | WishlistRemovedEvent
  | ProductRatedEvent;

export interface ProductStats {
  productId: string;
  purchaseCount: number;
  quantitySold: number;
  revenue: number;
  lastPurchasedAt?: string;
}

export interface PopularRecommendation {
  productId: string;
  score: number;
  reason: string;
  stats: ProductStats;
}

export interface CoPurchaseEdge {
  productId: string;
  relatedProductId: string;
  coPurchaseCount: number;
}

export interface AssociationRecommendation {
  sourceProductId: string;
  targetProductId: string;
  coPurchaseCount: number;
  support: number;
  confidence: number;
  lift: number;
  feedbackFactor: number;
  adjustedScore: number;
  reason: string;
}

export interface FeedbackStats {
  targetProductId: string;
  accepted: number;
  ignored: number;
  acceptanceRate: number;
  factor: number;
}

export interface EngineSnapshot {
  totalEvents: number;
  totalPurchases: number;
  uniqueProducts: number;
  productStats: ProductStats[];
}

export interface EventStore {
  append(event: RecommendationEvent): Promise<void>;
  getAll(): Promise<RecommendationEvent[]>;
  count(): Promise<number>;
  close(): Promise<void>;
}
