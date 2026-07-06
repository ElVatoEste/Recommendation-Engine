import { formatCompactNumber, formatPercent } from "@/lib/format";
import { Empty } from "@/components/ui";

export type Series = "pop" | "assoc" | "collab" | "trend" | "neutral";

const seriesColor: Record<Series, string> = {
  pop: "var(--color-s-pop)",
  assoc: "var(--color-s-assoc)",
  collab: "var(--color-s-collab)",
  trend: "var(--color-s-trend)",
  neutral: "var(--color-accent)",
};

export interface RankItem {
  label: string;
  value: number;
  reason?: string;
}

export function RankedList({
  items,
  series = "neutral",
  mode = "score",
  emptyLabel = "No signal yet.",
  max = 8,
}: {
  items: RankItem[];
  series?: Series;
  mode?: "score" | "percent";
  emptyLabel?: string;
  max?: number;
}) {
  const safe = items.filter((item) => Number.isFinite(item.value)).slice(0, max);
  if (safe.length === 0) {
    return <Empty>{emptyLabel}</Empty>;
  }
  const peak = Math.max(...safe.map((item) => item.value), 1e-9);
  const color = seriesColor[series];

  return (
    <ol className="flex flex-col">
      {safe.map((item, index) => {
        const pct = Math.max((item.value / peak) * 100, 2);
        return (
          <li
            key={`${item.label}-${index}`}
            className="border-b border-line/60 py-2 last:border-b-0"
          >
            <div className="flex items-baseline gap-3">
              <span className="tnum w-5 shrink-0 text-right text-xs text-neutral-600">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-white">
                {item.label}
              </span>
              <span className="tnum shrink-0 text-sm text-neutral-300">
                {mode === "percent"
                  ? formatPercent(item.value)
                  : formatCompactNumber(item.value)}
              </span>
            </div>
            <div className="mt-1.5 ml-8 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-strong)]"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            {item.reason && (
              <p className="mt-1 ml-8 text-xs leading-relaxed text-neutral-500">
                {item.reason}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
