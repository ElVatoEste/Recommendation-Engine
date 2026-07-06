import { useEffect, useState } from "react";

import { formatCompactNumber, formatPercent } from "@/lib/format";

export interface ScoreBarItem {
  label: string;
  value: number;
  caption: string;
  tone?: "cyan" | "emerald" | "violet" | "amber";
}

interface ScoreBarsProps {
  items: ScoreBarItem[];
  mode?: "score" | "percent";
}

const toneColor: Record<NonNullable<ScoreBarItem["tone"]>, string> = {
  cyan: "var(--color-accent)",
  emerald: "var(--color-s-collab)",
  violet: "var(--color-s-assoc)",
  amber: "var(--color-s-pop)",
};

export function ScoreBars({ items, mode = "score" }: ScoreBarsProps) {
  const safeItems = items.filter((item) => Number.isFinite(item.value));
  const maxValue = Math.max(...safeItems.map((item) => item.value), 1);

  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (safeItems.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line px-4 py-5 text-sm text-neutral-500">
        No signal to compare yet.
      </div>
    );
  }

  return (
    <ol className="flex flex-col">
      {safeItems.map((item, index) => {
        const target = Math.max((item.value / maxValue) * 100, 2);
        const color = toneColor[item.tone ?? "cyan"];
        return (
          <li
            key={`${item.label}-${item.caption}`}
            className="border-b border-line/60 py-2 last:border-b-0"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 flex-1 truncate text-sm text-white">
                {item.label}
              </span>
              <span className="tnum shrink-0 text-sm text-neutral-300">
                {mode === "percent"
                  ? formatPercent(item.value)
                  : formatCompactNumber(item.value)}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{
                  width: grown ? `${target}%` : "0%",
                  backgroundColor: color,
                  transition: "width 640ms var(--ease-out-strong)",
                  transitionDelay: `${index * 45}ms`,
                }}
              />
            </div>
            {item.caption && (
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                {item.caption}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
