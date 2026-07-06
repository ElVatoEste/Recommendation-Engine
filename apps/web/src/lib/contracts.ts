import type {
  AssociationRecommendation,
  CoPurchaseEdge,
  CoPurchaseGraph,
  CustomerProfile,
  CustomerRecommendation,
  CustomerSimilarity,
  EmbeddingRecommendation,
  EngineSnapshot,
  ExperimentReport,
  FeedbackStats,
  GraphEdge,
  GraphNode,
  HybridRecommendation,
  PopularRecommendation,
  ProductSimilarity,
  ProductStats,
  RecommendationEvent,
  RecommendationEventType,
  TrendStat,
} from "../../../../packages/shared/src/types.ts";

export type {
  AssociationRecommendation,
  CoPurchaseEdge,
  CoPurchaseGraph,
  CustomerProfile,
  CustomerRecommendation,
  CustomerSimilarity,
  EmbeddingRecommendation,
  EngineSnapshot,
  ExperimentReport,
  FeedbackStats,
  GraphEdge,
  GraphNode,
  HybridRecommendation,
  PopularRecommendation,
  ProductSimilarity,
  ProductStats,
  RecommendationEvent,
  RecommendationEventType,
  TrendStat,
};

export interface HealthResponse {
  status: string;
  storageMode: string;
  storageHealthy: boolean;
  snapshot: EngineSnapshot;
}

export interface EventsResponse {
  total: number;
  returned: number;
  events: RecommendationEvent[];
}

export interface StreamPayload {
  event: RecommendationEvent;
  snapshot: EngineSnapshot;
}
