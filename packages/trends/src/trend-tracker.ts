import type {
  PurchaseCreatedEvent,
  TrendStat,
} from "../../shared/src/index.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_TREND_WINDOW_MS = 30 * DAY_MS;

/**
 * Tracks purchase timestamps per product and derives short-term momentum by
 * comparing a recent window against the preceding one. Windows are measured
 * relative to the latest event seen (not the wall clock), so results are
 * deterministic and reproducible when replaying a fixed event log.
 */
export class TrendTracker {
  private readonly timestamps = new Map<string, number[]>();
  private latest = 0;

  registerPurchase(event: PurchaseCreatedEvent): void {
    const time = Date.parse(event.occurredAt);
    if (Number.isNaN(time)) {
      return;
    }

    this.latest = Math.max(this.latest, time);

    for (const item of event.items) {
      const times = this.timestamps.get(item.productId) ?? [];
      times.push(time);
      this.timestamps.set(item.productId, times);
    }
  }

  getTrends(windowMs = DEFAULT_TREND_WINDOW_MS): TrendStat[] {
    const recentFrom = this.latest - windowMs;
    const previousFrom = this.latest - 2 * windowMs;
    const windowDays = Math.round(windowMs / DAY_MS);

    return [...this.timestamps.entries()]
      .map(([productId, times]) => {
        let recentCount = 0;
        let previousCount = 0;

        for (const time of times) {
          if (time > recentFrom) {
            recentCount += 1;
          } else if (time > previousFrom) {
            previousCount += 1;
          }
        }

        const growthRate = (recentCount - previousCount) / (previousCount + 1);
        // Momentum: recent volume amplified by positive growth, damped by decline.
        const trendScore = recentCount * (1 + clamp(growthRate, -0.9, 5));

        return {
          productId,
          recentCount,
          previousCount,
          growthRate: Number(growthRate.toFixed(4)),
          trendScore: Number(trendScore.toFixed(4)),
          reason: buildReason(growthRate, recentCount, windowDays),
        } satisfies TrendStat;
      })
      .sort((left, right) => {
        if (right.trendScore !== left.trendScore) {
          return right.trendScore - left.trendScore;
        }

        return left.productId.localeCompare(right.productId);
      });
  }

  getTrendScores(windowMs = DEFAULT_TREND_WINDOW_MS): Map<string, number> {
    return new Map(
      this.getTrends(windowMs).map((trend) => [
        trend.productId,
        Math.max(0, trend.trendScore),
      ]),
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildReason(
  growthRate: number,
  recentCount: number,
  windowDays: number,
): string {
  if (recentCount === 0) {
    return `Sin compras en los ultimos ${windowDays} dias.`;
  }

  const percent = Math.round(growthRate * 100);
  if (percent > 0) {
    return `Subio ${percent}% en los ultimos ${windowDays} dias.`;
  }
  if (percent < 0) {
    return `Bajo ${Math.abs(percent)}% en los ultimos ${windowDays} dias.`;
  }
  return `Estable en los ultimos ${windowDays} dias.`;
}
