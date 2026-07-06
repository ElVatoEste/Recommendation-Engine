import type {
  GraphEdge,
  GraphNode,
  RecommendationEvent,
} from "./contracts";

export interface SimulationStep {
  index: number;
  event: RecommendationEvent;
  stage: "ingesta" | "estadisticas" | "grafo" | "ranking";
  before: {
    totalEvents: number;
    totalPurchases: number;
    uniqueProducts: number;
  };
  after: {
    totalEvents: number;
    totalPurchases: number;
    uniqueProducts: number;
  };
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  highlightedProductIds: string[];
  reasons: string[];
}

interface ProductAggregate {
  purchaseCount: number;
  quantitySold: number;
  revenue: number;
}

function sortPair(left: string, right: string): [string, string] {
  return left.localeCompare(right) <= 0 ? [left, right] : [right, left];
}

function snapshotFromStats(statsByProduct: Map<string, ProductAggregate>, totalEvents: number, totalPurchases: number) {
  return {
    totalEvents,
    totalPurchases,
    uniqueProducts: statsByProduct.size,
  };
}

function stageFromEvent(event: RecommendationEvent): SimulationStep["stage"] {
  switch (event.type) {
    case "PurchaseCreated":
      return "ranking";
    case "RecommendationAccepted":
    case "RecommendationIgnored":
      return "estadisticas";
    default:
      return "ingesta";
  }
}

function reasonsForEvent(event: RecommendationEvent): string[] {
  switch (event.type) {
    case "PurchaseCreated":
      return [
        `La compra ${event.orderId} fortalece ${event.items.map((item) => item.productId).join(", ")}.`,
        "Se recalculan estadísticas de producto y relaciones de co-compra.",
        "Las asociaciones y el ranking híbrido cambian en función de la nueva señal.",
      ];
    case "ProductViewed":
      return [
        `Se registró interés de navegación sobre ${event.productId}.`,
        "Todavía no cambia el grafo de compra, pero sí la narrativa conductual.",
      ];
    case "ProductClicked":
      return [
        `El clic en ${event.productId} actúa como señal de intención.`,
        "Esta señal puede influir después en exploración, tendencia o explicación.",
      ];
    case "RecommendationAccepted":
      return [
        `La recomendación ${event.recommendationProductId} fue aceptada.`,
        "El motor puede reforzar la estrategia que generó esa sugerencia.",
      ];
    case "RecommendationIgnored":
      return [
        `La recomendación ${event.recommendationProductId} fue ignorada.`,
        "La capa de feedback ajusta confianza y evita sobreexponer la misma sugerencia.",
      ];
    case "CartAbandoned":
      return [
        "Se registró abandono de carrito.",
        "Es una señal útil para fricción o interés no convertido.",
      ];
    case "WishlistAdded":
      return [
        `${event.productId} entra a wishlist.`,
        "Es una señal previa a compra que enriquece el perfil del usuario.",
      ];
    case "WishlistRemoved":
      return [
        `${event.productId} sale de wishlist.`,
        "La afinidad aparente con el producto pierde fuerza.",
      ];
    case "ProductRated":
      return [
        `${event.productId} recibe valoración ${event.rating}/5.`,
        "La calidad percibida del producto pasa a ser una señal explicable.",
      ];
    default:
      return ["Evento procesado."];
  }
}

function extractHighlightedProducts(event: RecommendationEvent): string[] {
  switch (event.type) {
    case "PurchaseCreated":
    case "CartAbandoned":
      return [...new Set(event.items.map((item) => item.productId))];
    case "ProductViewed":
    case "ProductClicked":
    case "WishlistAdded":
    case "WishlistRemoved":
    case "ProductRated":
      return [event.productId];
    case "RecommendationAccepted":
    case "RecommendationIgnored":
      return [event.recommendationProductId, event.sourceProductId].filter(
        (value): value is string => Boolean(value),
      );
    default:
      return [];
  }
}

function graphFromState(
  statsByProduct: Map<string, ProductAggregate>,
  edgeWeights: Map<string, number>,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = [...statsByProduct.entries()]
    .map(([id, aggregate]) => ({
      id,
      purchaseCount: aggregate.purchaseCount,
      degree: 0,
    }))
    .sort((left, right) => right.purchaseCount - left.purchaseCount || left.id.localeCompare(right.id));

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges = [...edgeWeights.entries()]
    .map(([pair, weight]) => {
      const [source, target] = pair.split("::");
      const sourceNode = nodeMap.get(source);
      const targetNode = nodeMap.get(target);
      if (sourceNode) sourceNode.degree += 1;
      if (targetNode) targetNode.degree += 1;
      return { source, target, weight };
    })
    .sort((left, right) => right.weight - left.weight || left.source.localeCompare(right.source))
    .slice(0, 18);

  return { nodes, edges };
}

function applyPurchase(
  event: Extract<RecommendationEvent, { type: "PurchaseCreated" }>,
  statsByProduct: Map<string, ProductAggregate>,
  edgeWeights: Map<string, number>,
): void {
  for (const item of event.items) {
    const aggregate = statsByProduct.get(item.productId) ?? {
      purchaseCount: 0,
      quantitySold: 0,
      revenue: 0,
    };

    aggregate.purchaseCount += 1;
    aggregate.quantitySold += item.quantity;
    aggregate.revenue += item.quantity * (item.unitPrice ?? 0);

    statsByProduct.set(item.productId, aggregate);
  }

  const productIds = [...new Set(event.items.map((item) => item.productId))];
  for (let index = 0; index < productIds.length; index += 1) {
    for (let nestedIndex = index + 1; nestedIndex < productIds.length; nestedIndex += 1) {
      const [left, right] = sortPair(productIds[index], productIds[nestedIndex]);
      const key = `${left}::${right}`;
      edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
    }
  }
}

export function buildSimulationSteps(events: RecommendationEvent[]): SimulationStep[] {
  const statsByProduct = new Map<string, ProductAggregate>();
  const edgeWeights = new Map<string, number>();
  let totalEvents = 0;
  let totalPurchases = 0;

  return events.map((event, index) => {
    const before = snapshotFromStats(statsByProduct, totalEvents, totalPurchases);

    totalEvents += 1;
    if (event.type === "PurchaseCreated") {
      totalPurchases += 1;
      applyPurchase(event, statsByProduct, edgeWeights);
    }

    const after = snapshotFromStats(statsByProduct, totalEvents, totalPurchases);

    return {
      index,
      event,
      stage: stageFromEvent(event),
      before,
      after,
      graph: graphFromState(statsByProduct, edgeWeights),
      highlightedProductIds: extractHighlightedProducts(event),
      reasons: reasonsForEvent(event),
    };
  });
}
