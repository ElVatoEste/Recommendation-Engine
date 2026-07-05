import type {
  AssociationRecommendation,
  CoPurchaseEdge,
  CoPurchaseGraph,
  CustomerProfile,
  CustomerRecommendation,
  CustomerSimilarity,
  EmbeddingRecommendation,
  EvaluationReport,
  ExperimentConfig,
  ExperimentReport,
  FeedbackStats,
  HybridRecommendation,
  ProductSimilarity,
  HybridWeights,
  PopularRecommendation,
  ProductStats,
  PurchaseItem,
  RecommendationEvent,
  TrendStat,
} from "../../../packages/shared/src/index.ts";

export interface HealthResponse {
  status: string;
  storageMode: string;
  storageHealthy: boolean;
  snapshot: {
    totalEvents: number;
    totalPurchases: number;
    uniqueProducts: number;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Thin HTTP client over the Recommendation API. */
export class RecommendationApiClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers },
      });
    } catch (cause) {
      throw new ApiError(
        `Cannot reach the API at ${this.baseUrl}. Is it running? (bun run dev:api)`,
      );
    }

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        (body as { error?: string }).error ?? `HTTP ${response.status}`;
      throw new ApiError(message, response.status);
    }

    return body as T;
  }

  health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health");
  }

  async popular(limit: number): Promise<PopularRecommendation[]> {
    const body = await this.request<{ recommendations: PopularRecommendation[] }>(
      `/recommendations/popular?limit=${limit}`,
    );
    return body.recommendations;
  }

  async stats(): Promise<ProductStats[]> {
    const body = await this.request<{ products: ProductStats[] }>(
      "/stats/products",
    );
    return body.products;
  }

  async coPurchases(
    productId: string,
    limit: number,
  ): Promise<CoPurchaseEdge[]> {
    const body = await this.request<{ edges: CoPurchaseEdge[] }>(
      `/graph/co-purchases?productId=${encodeURIComponent(productId)}&limit=${limit}`,
    );
    return body.edges;
  }

  async associations(
    productId: string,
    limit: number,
  ): Promise<AssociationRecommendation[]> {
    const body = await this.request<{
      associations: AssociationRecommendation[];
    }>(`/associations?productId=${encodeURIComponent(productId)}&limit=${limit}`);
    return body.associations;
  }

  feedback(): Promise<{ feedback: FeedbackStats[] }> {
    return this.request<{ feedback: FeedbackStats[] }>("/feedback/stats");
  }

  events(limit: number): Promise<{
    total: number;
    returned: number;
    events: RecommendationEvent[];
  }> {
    return this.request(`/events?limit=${limit}`);
  }

  purchase(payload: {
    orderId: string;
    customerId?: string;
    items: PurchaseItem[];
  }): Promise<{ snapshot: HealthResponse["snapshot"] }> {
    return this.request("/events/purchase", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  event(payload: Record<string, unknown>): Promise<unknown> {
    return this.request("/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async customers(): Promise<CustomerProfile[]> {
    const body = await this.request<{ customers: CustomerProfile[] }>(
      "/customers",
    );
    return body.customers;
  }

  customerProfile(customerId: string): Promise<CustomerProfile> {
    return this.request<CustomerProfile>(
      `/customers/${encodeURIComponent(customerId)}/profile`,
    );
  }

  async customerRecommendations(
    customerId: string,
    limit: number,
  ): Promise<CustomerRecommendation[]> {
    const body = await this.request<{
      recommendations: CustomerRecommendation[];
    }>(
      `/customers/${encodeURIComponent(customerId)}/recommendations?limit=${limit}`,
    );
    return body.recommendations;
  }

  async similarCustomers(
    customerId: string,
    limit: number,
  ): Promise<CustomerSimilarity[]> {
    const body = await this.request<{ similar: CustomerSimilarity[] }>(
      `/customers/${encodeURIComponent(customerId)}/similar?limit=${limit}`,
    );
    return body.similar;
  }

  graph(): Promise<CoPurchaseGraph> {
    return this.request<CoPurchaseGraph>("/graph");
  }

  evaluate(k: number): Promise<EvaluationReport> {
    return this.request<EvaluationReport>(`/evaluate?k=${k}`);
  }

  async similarProducts(
    productId: string,
    limit: number,
  ): Promise<ProductSimilarity[]> {
    const body = await this.request<{ similar: ProductSimilarity[] }>(
      `/products/${encodeURIComponent(productId)}/similar?limit=${limit}`,
    );
    return body.similar;
  }

  async embeddingRecommendations(
    customerId: string,
    limit: number,
  ): Promise<EmbeddingRecommendation[]> {
    const body = await this.request<{
      recommendations: EmbeddingRecommendation[];
    }>(
      `/customers/${encodeURIComponent(customerId)}/embedding-recommendations?limit=${limit}`,
    );
    return body.recommendations;
  }

  async trending(limit: number, windowDays?: number): Promise<TrendStat[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (windowDays) params.set("windowDays", String(windowDays));
    const body = await this.request<{ trends: TrendStat[] }>(
      `/recommendations/trending?${params.toString()}`,
    );
    return body.trends;
  }

  async hybrid(
    customerId: string | undefined,
    limit: number,
    weights?: HybridWeights,
  ): Promise<HybridRecommendation[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (customerId) params.set("customer", customerId);
    if (weights) {
      params.set("wPop", String(weights.popularity));
      params.set("wAssoc", String(weights.association));
      params.set("wCollab", String(weights.collaborative));
      params.set("wTrend", String(weights.trend));
    }

    const body = await this.request<{ recommendations: HybridRecommendation[] }>(
      `/recommendations/hybrid?${params.toString()}`,
    );
    return body.recommendations;
  }

  async experiments(): Promise<ExperimentConfig[]> {
    const body = await this.request<{ experiments: ExperimentConfig[] }>(
      "/experiments",
    );
    return body.experiments;
  }

  experimentReport(experimentId: string): Promise<ExperimentReport> {
    return this.request<ExperimentReport>(
      `/experiments/${encodeURIComponent(experimentId)}/report`,
    );
  }

  experimentRecommendations(
    experimentId: string,
    customerId: string,
    limit: number,
  ): Promise<{ variantId: string; recommendations: HybridRecommendation[] }> {
    return this.request(
      `/experiments/${encodeURIComponent(experimentId)}/recommendations?customer=${encodeURIComponent(customerId)}&limit=${limit}`,
    );
  }
}
