import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

/** Flat panel. Hairline border, near-black fill. No gradient, no heavy shadow. */
export function Panel({
  title,
  hint,
  actions,
  className,
  bodyClassName,
  children,
}: PropsWithChildren<{
  title?: string;
  hint?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
}>) {
  return (
    <section
      className={cn(
        "rounded-xl border border-line bg-panel",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-sm font-semibold text-white">
                {title}
              </h2>
            )}
            {hint && (
              <p className="mt-0.5 truncate text-xs text-neutral-500">{hint}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

const buttonVariants = {
  primary:
    "bg-accent text-black hover:bg-amber-300 disabled:bg-neutral-700 disabled:text-neutral-400",
  ghost:
    "border border-line-strong bg-transparent text-neutral-200 hover:bg-white/5 disabled:text-neutral-500",
  subtle:
    "bg-white/5 text-neutral-200 hover:bg-white/10 disabled:text-neutral-500",
} as const;

export function Button({
  variant = "primary",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
}) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color,transform] duration-150 ease-[var(--ease-out-strong)] active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100",
        buttonVariants[variant],
        className,
      )}
    />
  );
}

export function Field({
  label,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
          {label}
        </span>
      )}
      <input
        {...rest}
        className={cn(
          "w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-white placeholder:text-neutral-600 transition-colors duration-150 outline-none hover:border-line-strong focus-visible:border-accent",
          className,
        )}
      />
    </label>
  );
}

export function Select({
  label,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
          {label}
        </span>
      )}
      <select
        {...rest}
        className={cn(
          "w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-white transition-colors duration-150 outline-none hover:border-line-strong focus-visible:border-accent",
          className,
        )}
      >
        {children}
      </select>
    </label>
  );
}

/** Segmented control (replaces toggle-button pairs). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-line bg-panel-2 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded px-3 py-1.5 text-sm transition-colors duration-150 ease-[var(--ease-out-strong)]",
            value === option.value
              ? "bg-white/10 text-white"
              : "text-neutral-400 hover:text-neutral-200",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: PropsWithChildren) {
  return (
    <div className="rounded-md border border-dashed border-line px-4 py-6 text-center text-sm text-neutral-500">
      {children}
    </div>
  );
}
