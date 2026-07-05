import type {
  CartAbandonedEvent,
  ProductClickedEvent,
  ProductRatedEvent,
  ProductViewedEvent,
  PurchaseCreatedEvent,
  PurchaseItem,
  RecommendationAcceptedEvent,
  RecommendationEvent,
  RecommendationEventBase,
  RecommendationIgnoredEvent,
  WishlistAddedEvent,
  WishlistRemovedEvent,
} from "./types.ts";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeMetadata(value: unknown): Record<string, string> | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const entries: Array<[string, string]> = [];

  for (const [key, current] of Object.entries(value as Record<string, unknown>)) {
    if (isNonEmptyString(key) && isNonEmptyString(current)) {
      entries.push([key, current]);
    }
  }

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function validateEventBase(value: unknown): RecommendationEventBase {
  if (typeof value !== "object" || value === null) {
    throw new Error("Request body must be an object.");
  }

  const candidate = value as Record<string, unknown>;

  if (!isNonEmptyString(candidate.id)) {
    throw new Error("Event.id is required.");
  }

  if (!isNonEmptyString(candidate.type)) {
    throw new Error("Event.type is required.");
  }

  if (!isNonEmptyString(candidate.occurredAt)) {
    throw new Error("Event.occurredAt is required.");
  }

  if (
    candidate.customerId !== undefined &&
    !isNonEmptyString(candidate.customerId)
  ) {
    throw new Error("Event.customerId must be a non-empty string.");
  }

  return {
    id: candidate.id,
    type: candidate.type as RecommendationEvent["type"],
    occurredAt: candidate.occurredAt,
    customerId: candidate.customerId,
    metadata: normalizeMetadata(candidate.metadata),
  };
}

function validatePurchaseItems(items: unknown, fieldName: string): PurchaseItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`${fieldName} must contain at least one item.`);
  }

  return items.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`${fieldName}[${index}] must be an object.`);
    }

    const candidate = item as Record<string, unknown>;

    if (!isNonEmptyString(candidate.productId)) {
      throw new Error(`${fieldName}[${index}].productId is required.`);
    }

    if (!isValidQuantity(candidate.quantity)) {
      throw new Error(`${fieldName}[${index}].quantity must be > 0.`);
    }

    const unitPrice =
      candidate.unitPrice === undefined
        ? undefined
        : Number(candidate.unitPrice);

    if (unitPrice !== undefined && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
      throw new Error(`${fieldName}[${index}].unitPrice must be >= 0.`);
    }

    return {
      productId: candidate.productId,
      quantity: candidate.quantity,
      unitPrice,
    };
  });
}

function validateProductId(value: unknown, fieldName: string): string {
  if (!isNonEmptyString(value)) {
    throw new Error(`${fieldName} is required.`);
  }

  return value;
}

export function validatePurchaseCreatedEvent(
  value: unknown,
): PurchaseCreatedEvent {
  const base = validateEventBase(value);
  const candidate = value as Record<string, unknown>;

  if (!isNonEmptyString(candidate.orderId)) {
    throw new Error("PurchaseCreated.orderId is required.");
  }

  return {
    ...base,
    type: "PurchaseCreated",
    orderId: candidate.orderId,
    items: validatePurchaseItems(candidate.items, "PurchaseCreated.items"),
  };
}

function validateProductViewedEvent(value: unknown): ProductViewedEvent {
  const base = validateEventBase(value);
  const candidate = value as Record<string, unknown>;

  return {
    ...base,
    type: "ProductViewed",
    productId: validateProductId(candidate.productId, "ProductViewed.productId"),
  };
}

function validateProductClickedEvent(value: unknown): ProductClickedEvent {
  const base = validateEventBase(value);
  const candidate = value as Record<string, unknown>;

  return {
    ...base,
    type: "ProductClicked",
    productId: validateProductId(candidate.productId, "ProductClicked.productId"),
  };
}

function validateWishlistAddedEvent(value: unknown): WishlistAddedEvent {
  const base = validateEventBase(value);
  const candidate = value as Record<string, unknown>;

  return {
    ...base,
    type: "WishlistAdded",
    productId: validateProductId(candidate.productId, "WishlistAdded.productId"),
  };
}

function validateWishlistRemovedEvent(value: unknown): WishlistRemovedEvent {
  const base = validateEventBase(value);
  const candidate = value as Record<string, unknown>;

  return {
    ...base,
    type: "WishlistRemoved",
    productId: validateProductId(
      candidate.productId,
      "WishlistRemoved.productId",
    ),
  };
}

function validateProductRatedEvent(value: unknown): ProductRatedEvent {
  const base = validateEventBase(value);
  const candidate = value as Record<string, unknown>;
  const rating = Number(candidate.rating);

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("ProductRated.rating must be a number between 0 and 5.");
  }

  return {
    ...base,
    type: "ProductRated",
    productId: validateProductId(candidate.productId, "ProductRated.productId"),
    rating,
  };
}

function validateRecommendationAcceptedEvent(
  value: unknown,
): RecommendationAcceptedEvent {
  const base = validateEventBase(value);
  const candidate = value as Record<string, unknown>;

  return {
    ...base,
    type: "RecommendationAccepted",
    recommendationProductId: validateProductId(
      candidate.recommendationProductId,
      "RecommendationAccepted.recommendationProductId",
    ),
    sourceProductId:
      candidate.sourceProductId === undefined
        ? undefined
        : validateProductId(
            candidate.sourceProductId,
            "RecommendationAccepted.sourceProductId",
          ),
  };
}

function validateRecommendationIgnoredEvent(
  value: unknown,
): RecommendationIgnoredEvent {
  const base = validateEventBase(value);
  const candidate = value as Record<string, unknown>;

  return {
    ...base,
    type: "RecommendationIgnored",
    recommendationProductId: validateProductId(
      candidate.recommendationProductId,
      "RecommendationIgnored.recommendationProductId",
    ),
    sourceProductId:
      candidate.sourceProductId === undefined
        ? undefined
        : validateProductId(
            candidate.sourceProductId,
            "RecommendationIgnored.sourceProductId",
          ),
  };
}

function validateCartAbandonedEvent(value: unknown): CartAbandonedEvent {
  const base = validateEventBase(value);
  const candidate = value as Record<string, unknown>;

  return {
    ...base,
    type: "CartAbandoned",
    items: validatePurchaseItems(candidate.items, "CartAbandoned.items"),
  };
}

export function validateRecommendationEvent(value: unknown): RecommendationEvent {
  const base = validateEventBase(value);

  switch (base.type) {
    case "PurchaseCreated":
      return validatePurchaseCreatedEvent(value);
    case "ProductViewed":
      return validateProductViewedEvent(value);
    case "ProductClicked":
      return validateProductClickedEvent(value);
    case "RecommendationAccepted":
      return validateRecommendationAcceptedEvent(value);
    case "RecommendationIgnored":
      return validateRecommendationIgnoredEvent(value);
    case "CartAbandoned":
      return validateCartAbandonedEvent(value);
    case "WishlistAdded":
      return validateWishlistAddedEvent(value);
    case "WishlistRemoved":
      return validateWishlistRemovedEvent(value);
    case "ProductRated":
      return validateProductRatedEvent(value);
    default:
      throw new Error(`Unsupported event type: ${base.type}`);
  }
}
