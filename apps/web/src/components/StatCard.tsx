import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: "cyan" | "emerald" | "violet" | "amber";
}

const toneClassMap = {
  cyan: "from-cyan-400/18 to-sky-400/8 text-cyan-100 border-cyan-300/20",
  emerald: "from-emerald-400/18 to-lime-400/8 text-emerald-100 border-emerald-300/20",
  violet: "from-violet-400/18 to-fuchsia-400/8 text-violet-100 border-violet-300/20",
  amber: "from-amber-400/18 to-orange-400/8 text-amber-100 border-amber-300/20",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "cyan",
}: StatCardProps) {
  return (
    <article
      className={`group/stat rounded-[24px] border bg-gradient-to-br p-5 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-strong)] hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(2,6,23,0.9)] ${toneClassMap[tone]}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.28em] text-slate-300/75">
          {label}
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-slate-100 transition-transform duration-300 ease-[var(--ease-out-strong)] group-hover/stat:scale-110">
          {icon}
        </span>
      </div>
      <div className="space-y-2">
        <p className="font-display text-4xl leading-none text-white">{value}</p>
        <p className="text-sm text-slate-300/78">{hint}</p>
      </div>
    </article>
  );
}
