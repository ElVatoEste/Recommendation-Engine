import type { RecommendationEvent, RecommendationEventType } from "./contracts";

const numberFormatter = new Intl.NumberFormat("es-MX");
const compactNumberFormatter = new Intl.NumberFormat("es-MX", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat("es-MX", {
  style: "percent",
  maximumFractionDigits: 1,
});

const eventLabels: Record<RecommendationEventType, string> = {
  PurchaseCreated: "Compra registrada",
  ProductViewed: "Producto visto",
  ProductClicked: "Producto clicado",
  RecommendationAccepted: "Recomendación aceptada",
  RecommendationIgnored: "Recomendación ignorada",
  CartAbandoned: "Carrito abandonado",
  WishlistAdded: "Añadido a wishlist",
  WishlistRemoved: "Quitado de wishlist",
  ProductRated: "Producto valorado",
};

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(value);
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return "sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatEventType(type: RecommendationEventType): string {
  return eventLabels[type];
}

export function describeEvent(event: RecommendationEvent): string {
  switch (event.type) {
    case "PurchaseCreated":
      return `${event.items.length} item(s) en ${event.orderId}`;
    case "ProductViewed":
    case "ProductClicked":
    case "WishlistAdded":
    case "WishlistRemoved":
    case "ProductRated":
      return event.productId;
    case "RecommendationAccepted":
    case "RecommendationIgnored":
      return event.recommendationProductId;
    case "CartAbandoned":
      return `${event.items.length} item(s) abandonados`;
  }
}

export function extractEventProducts(event: RecommendationEvent): string[] {
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
  }
}

export function eventAccent(type: RecommendationEventType): string {
  switch (type) {
    case "PurchaseCreated":
      return "from-cyan-400/30 to-sky-500/10";
    case "RecommendationAccepted":
      return "from-emerald-400/30 to-emerald-500/10";
    case "RecommendationIgnored":
    case "CartAbandoned":
      return "from-rose-400/30 to-orange-500/10";
    default:
      return "from-violet-400/25 to-fuchsia-500/10";
  }
}
