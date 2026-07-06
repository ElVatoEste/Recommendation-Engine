import { useEffect, type PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

import { useAsyncData } from "@/hooks/useAsyncData";
import { observatoryApi } from "@/lib/api";
import { formatCompactNumber } from "@/lib/format";
import { useObservatoryStore } from "@/store/observatoryStore";

const navigation = [
  { to: "/", label: "Sandbox" },
  { to: "/explorador", label: "Explorer" },
  { to: "/laboratorio", label: "Playback" },
];

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col leading-none">
      <span className="tnum text-sm font-semibold text-white">
        {formatCompactNumber(value)}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </span>
    </div>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const { liveSnapshot, streamConnected, setLiveSnapshot, revision } =
    useObservatoryStore();
  const { data } = useAsyncData(() => observatoryApi.health(), [revision]);

  // Seed the store snapshot from the initial health payload.
  useEffect(() => {
    if (data?.snapshot && !liveSnapshot) {
      setLiveSnapshot(data.snapshot);
    }
  }, [data?.snapshot, liveSnapshot, setLiveSnapshot]);

  const snap = liveSnapshot ?? data?.snapshot;

  return (
    <div className="min-h-[100dvh] bg-base text-neutral-200">
      <header className="sticky top-0 z-40 border-b border-line bg-base/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-6 px-4 md:px-6">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm font-semibold tracking-tight text-white">
              recengine
            </span>
            <span className="font-mono text-xs text-accent">/sandbox</span>
          </div>

          <nav className="flex items-center gap-1">
            {navigation.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors duration-150 ease-[var(--ease-out-strong)] ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-5 md:flex">
            <Counter label="events" value={snap?.totalEvents ?? 0} />
            <Counter label="orders" value={snap?.totalPurchases ?? 0} />
            <Counter label="products" value={snap?.uniqueProducts ?? 0} />
            <Counter label="customers" value={snap?.uniqueCustomers ?? 0} />
          </div>

          <div
            className="flex items-center gap-2"
            title={streamConnected ? "SSE stream live" : "SSE stream idle"}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                streamConnected
                  ? "bg-accent shadow-[0_0_10px_var(--color-accent)]"
                  : "bg-neutral-600"
              }`}
            />
            <span className="hidden text-[11px] uppercase tracking-[0.16em] text-neutral-500 lg:inline">
              {streamConnected ? "live" : "idle"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6">
        {children}
      </main>
    </div>
  );
}
