import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  className?: string;
}

export function SectionCard({
  eyebrow,
  title,
  description,
  aside,
  className,
  children,
}: SectionCardProps) {
  return (
    <section
      className={`group/card rounded-[28px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl transition-[border-color,box-shadow,transform] duration-300 ease-[var(--ease-out-strong)] hover:-translate-y-0.5 hover:border-white/[0.16] hover:shadow-[0_32px_90px_rgba(2,6,23,0.6)] ${className ?? ""}`}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          {eyebrow ? (
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/70">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-display text-2xl text-slate-50">{title}</h2>
          {description ? (
            <p className="max-w-2xl text-sm text-slate-400">{description}</p>
          ) : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
