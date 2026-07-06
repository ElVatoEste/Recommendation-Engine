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
      className={`rounded-xl border border-line bg-panel ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          {eyebrow ? (
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description ? (
            <p className="max-w-2xl text-xs text-neutral-500">{description}</p>
          ) : null}
        </div>
        {aside}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
