import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

const navigation = [
  { to: "/", label: "Control Room", glyph: "CR" },
  { to: "/laboratorio", label: "Laboratorio", glyph: "LB" },
  { to: "/explorador", label: "Explorador", glyph: "EX" },
];

const navItemBase =
  "group flex items-center justify-between rounded-2xl border px-4 py-3 transition-[background-color,border-color,transform,box-shadow] duration-200 ease-[var(--ease-out-strong)] active:scale-[0.98]";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[#020816] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-18%] h-[38rem] w-[38rem] rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[32rem] w-[32rem] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-16%] left-[25%] h-[26rem] w-[26rem] rounded-full bg-emerald-400/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.15),rgba(2,6,23,0.85))]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1560px] gap-6 px-4 py-4 md:px-6 lg:px-8">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-[30px] border border-white/10 bg-slate-950/65 p-6 backdrop-blur-xl lg:flex">
          <div className="mb-10 space-y-4">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.32em] text-cyan-200">
              Recommendation Engine
            </div>
            <div>
              <p className="font-display text-3xl leading-none text-white">
                Visual Observatory
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Una web para ver cómo el motor aprende, conecta productos y arma el ranking en tiempo real.
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map(({ to, label, glyph }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${navItemBase} ${
                    isActive
                      ? "border-cyan-300/35 bg-cyan-400/12 text-white shadow-[0_10px_30px_-12px_rgba(34,211,238,0.5)]"
                      : "border-white/6 bg-white/[0.03] text-slate-300 hover:-translate-y-0.5 hover:border-white/12 hover:bg-white/[0.05]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 ease-[var(--ease-out-strong)] ${
                          isActive
                            ? "bg-cyan-300/25 text-cyan-50"
                            : "bg-white/8 text-slate-200 group-hover:bg-white/12"
                        }`}
                      >
                        {glyph}
                      </span>
                      <span className="text-sm">{label}</span>
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full bg-current transition-opacity duration-200 ${
                        isActive
                          ? "opacity-100"
                          : "opacity-40 group-hover:opacity-100"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
              Narrativa visual
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Evento entra. Señal cambia. Grafo responde. Ranking se reacomoda. La interfaz está armada para que eso se entienda sin leer el código.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="mb-4 flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-slate-950/65 px-4 py-3 backdrop-blur-xl lg:hidden">
            <p className="font-display text-lg leading-none text-white">
              Visual Observatory
            </p>
            <nav className="flex gap-1.5">
              {navigation.map(({ to, glyph, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  aria-label={label}
                  className={({ isActive }) =>
                    `flex h-9 w-9 items-center justify-center rounded-xl border text-[11px] font-semibold uppercase tracking-[0.16em] transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out-strong)] active:scale-95 ${
                      isActive
                        ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-50"
                        : "border-white/8 bg-white/[0.03] text-slate-300"
                    }`
                  }
                >
                  {glyph}
                </NavLink>
              ))}
            </nav>
          </header>

          <main className="relative flex-1 pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
