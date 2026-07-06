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

const toneClassMap = {
  cyan: "from-cyan-300 to-sky-400",
  emerald: "from-emerald-300 to-lime-400",
  violet: "from-violet-300 to-fuchsia-400",
  amber: "from-amber-300 to-orange-400",
} as const;

export function ScoreBars({ items, mode = "score" }: ScoreBarsProps) {
  const safeItems = items.filter((item) => Number.isFinite(item.value));
  const maxValue = Math.max(...safeItems.map((item) => item.value), 1);

  // Grow bars from 0 after mount so the ranking reads as it settles.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (safeItems.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-slate-500">
        No hay señales suficientes para comparar estrategias todavía.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {safeItems.map((item, index) => {
        const target = Math.max((item.value / maxValue) * 100, 6);
        return (
          <div key={`${item.label}-${item.caption}`} className="group/bar space-y-2">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-100">{item.label}</p>
                <p className="text-xs text-slate-500">{item.caption}</p>
              </div>
              <p className="text-sm tabular-nums text-slate-300">
                {mode === "percent"
                  ? formatPercent(item.value)
                  : formatCompactNumber(item.value)}
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${toneClassMap[item.tone ?? "cyan"]}`}
                style={{
                  width: grown ? `${target}%` : "0%",
                  transition:
                    "width 720ms var(--ease-out-strong)",
                  transitionDelay: `${index * 60}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
