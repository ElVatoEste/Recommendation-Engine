import type {
  AssociationRecommendation,
  CoPurchaseEdge,
  CoPurchaseGraph,
  CustomerProfile,
  CustomerRecommendation,
  CustomerSimilarity,
  EmbeddingRecommendation,
  EventsResponse,
  ExperimentReport,
  FeedbackStats,
  HealthResponse,
  HybridRecommendation,
  PopularRecommendation,
  ProductSimilarity,
  ProductStats,
  TrendStat,
} from "./contracts";

const importMeta = import.meta as ImportMeta & {
  env?: {
    VITE_API_URL?: string;
  };
};
const configuredBase = importMeta.env?.VITE_API_URL?.trim();
const API_BASE = configuredBase && configuredBase.length > 0 ? configuredBase : "/api";

function buildUrl(path: string): string {
  if (/^https?:\/\//.test(API_BASE)) {
    return `${API_BASE}${path}`;
  }

  return `${API_BASE}${path}`;
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(buildUrl(path));
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error?: string }).error ?? `HTTP ${response.status}`)
        : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export function buildStreamUrl(path: string): string {
  return buildUrl(path);
}

export const observatoryApi = {
  health(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },
  async popular(limit = 6): Promise<PopularRecommendation[]> {
    const body = await request<{ recommendations: PopularRecommendation[] }>(
      `/recommendations/popular?limit=${limit}`,
    );
    return body.recommendations;
  },
  async trending(limit = 6, windowDays = 30): Promise<TrendStat[]> {
    const body = await request<{ trends: TrendStat[] }>(
      `/recommendations/trending?limit=${limit}&windowDays=${windowDays}`,
    );
    return body.trends;
  },
  events(limit = 24): Promise<EventsResponse> {
    return request<EventsResponse>(`/events?limit=${limit}`);
  },
  graph(): Promise<CoPurchaseGraph> {
    return request<CoPurchaseGraph>("/graph");
  },
  async stats(): Promise<ProductStats[]> {
    const body = await request<{ products: ProductStats[] }>("/stats/products");
    return body.products;
  },
  async coPurchases(productId: string, limit = 8): Promise<CoPurchaseEdge[]> {
    const body = await request<{ edges: CoPurchaseEdge[] }>(
      `/graph/co-purchases?productId=${encodeURIComponent(productId)}&limit=${limit}`,
    );
    return body.edges;
  },
  async associations(
    productId: string,
    limit = 8,
  ): Promise<AssociationRecommendation[]> {
    const body = await request<{ associations: AssociationRecommendation[] }>(
      `/associations?productId=${encodeURIComponent(productId)}&limit=${limit}`,
    );
    return body.associations;
  },
  async similarProducts(
    productId: string,
    limit = 8,
  ): Promise<ProductSimilarity[]> {
    const body = await request<{ similar: ProductSimilarity[] }>(
      `/products/${encodeURIComponent(productId)}/similar?limit=${limit}`,
    );
    return body.similar;
  },
  async customers(): Promise<CustomerProfile[]> {
    const body = await request<{ customers: CustomerProfile[] }>("/customers");
    return body.customers;
  },
  customerProfile(customerId: string): Promise<CustomerProfile> {
    return request<CustomerProfile>(
      `/customers/${encodeURIComponent(customerId)}/profile`,
    );
  },
  async customerRecommendations(
    customerId: string,
    limit = 8,
  ): Promise<CustomerRecommendation[]> {
    const body = await request<{ recommendations: CustomerRecommendation[] }>(
      `/customers/${encodeURIComponent(customerId)}/recommendations?limit=${limit}`,
    );
    return body.recommendations;
  },
  async similarCustomers(
    customerId: string,
    limit = 6,
  ): Promise<CustomerSimilarity[]> {
    const body = await request<{ similar: CustomerSimilarity[] }>(
      `/customers/${encodeURIComponent(customerId)}/similar?limit=${limit}`,
    );
    return body.similar;
  },
  async embeddingRecommendations(
    customerId: string,
    limit = 8,
  ): Promise<EmbeddingRecommendation[]> {
    const body = await request<{ recommendations: EmbeddingRecommendation[] }>(
      `/customers/${encodeURIComponent(customerId)}/embedding-recommendations?limit=${limit}`,
    );
    return body.recommendations;
  },
  async hybridRecommendations(
    customerId: string,
    limit = 8,
  ): Promise<HybridRecommendation[]> {
    const body = await request<{ recommendations: HybridRecommendation[] }>(
      `/recommendations/hybrid?customer=${encodeURIComponent(customerId)}&limit=${limit}`,
    );
    return body.recommendations;
  },
  async feedback(): Promise<FeedbackStats[]> {
    const body = await request<{ feedback: FeedbackStats[] }>("/feedback/stats");
    return body.feedback;
  },
  evaluate(k = 5): Promise<ExperimentReport | unknown> {
    return request(`/evaluate?k=${k}`);
  },
};
