import type {
  FeedbackStats,
  RecommendationAcceptedEvent,
  RecommendationIgnoredEvent,
} from "../../shared/src/index.ts";

interface FeedbackCounts {
  accepted: number;
  ignored: number;
}

function pairKey(sourceProductId: string, targetProductId: string): string {
  return `${sourceProductId}=>${targetProductId}`;
}

/**
 * Laplace-smoothed acceptance rate mapped to a multiplier centered at 1.0.
 *
 * rate = (accepted + 1) / (accepted + ignored + 2) lands in (0, 1) with 0.5
 * as the no-evidence prior; doubling it yields a factor in (0, 2) where 1.0 is
 * neutral, > 1 boosts a well-received recommendation, and < 1 penalizes an
 * ignored one.
 */
function toFactor(counts: FeedbackCounts): number {
  const rate =
    (counts.accepted + 1) / (counts.accepted + counts.ignored + 2);
  return Number((2 * rate).toFixed(4));
}

export class RecommendationFeedbackTracker {
  private readonly byTarget = new Map<string, FeedbackCounts>();
  private readonly byPair = new Map<string, FeedbackCounts>();

  registerAccepted(event: RecommendationAcceptedEvent): void {
    this.record(event, "accepted");
  }

  registerIgnored(event: RecommendationIgnoredEvent): void {
    this.record(event, "ignored");
  }

  /**
   * Feedback multiplier for a recommendation. A source-specific signal is used
   * when available; otherwise it falls back to the target's global feedback,
   * and to a neutral 1.0 when there is no evidence yet.
   */
  getFactor(targetProductId: string, sourceProductId?: string): number {
    if (sourceProductId) {
      const pair = this.byPair.get(pairKey(sourceProductId, targetProductId));

      if (pair && pair.accepted + pair.ignored > 0) {
        return toFactor(pair);
      }
    }

    const target = this.byTarget.get(targetProductId);
    return target ? toFactor(target) : 1;
  }

  getStats(): FeedbackStats[] {
    return [...this.byTarget.entries()]
      .map(([targetProductId, counts]) => ({
        targetProductId,
        accepted: counts.accepted,
        ignored: counts.ignored,
        acceptanceRate: Number(
          (
            (counts.accepted + 1) /
            (counts.accepted + counts.ignored + 2)
          ).toFixed(4),
        ),
        factor: toFactor(counts),
      }))
      .sort((left, right) => {
        if (right.factor !== left.factor) {
          return right.factor - left.factor;
        }

        return left.targetProductId.localeCompare(right.targetProductId);
      });
  }

  private record(
    event: RecommendationAcceptedEvent | RecommendationIgnoredEvent,
    kind: keyof FeedbackCounts,
  ): void {
    this.bump(this.byTarget, event.recommendationProductId, kind);

    if (event.sourceProductId) {
      this.bump(
        this.byPair,
        pairKey(event.sourceProductId, event.recommendationProductId),
        kind,
      );
    }
  }

  private bump(
    store: Map<string, FeedbackCounts>,
    key: string,
    kind: keyof FeedbackCounts,
  ): void {
    const current = store.get(key) ?? { accepted: 0, ignored: 0 };
    current[kind] += 1;
    store.set(key, current);
  }
}
