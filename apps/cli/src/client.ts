import type {
  AssociationRecommendation,
  CoPurchaseEdge,
  FeedbackStats,
  PopularRecommendation,
  ProductStats,
  PurchaseItem,
  RecommendationEvent,
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
}
