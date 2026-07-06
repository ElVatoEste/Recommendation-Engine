import { useMemo, useState } from "react";

import { Panel, Segmented, Select, Button, Empty } from "@/components/ui";
import { RankedList } from "@/components/RankedList";
import { useAsyncData } from "@/hooks/useAsyncData";
import { observatoryApi, type HybridWeights } from "@/lib/api";
import { formatCompactNumber } from "@/lib/format";
import { useObservatoryStore } from "@/store/observatoryStore";

type Entity = "customer" | "product";

const DEFAULT_WEIGHTS: HybridWeights = {
  popularity: 0.25,
  association: 0.25,
  collaborative: 0.25,
  trend: 0.25,
};

const WEIGHT_META: Array<{
  key: keyof HybridWeights;
  label: string;
  series: "pop" | "assoc" | "collab" | "trend";
  desc: string;
}> = [
  {
    key: "popularity",
    label: "Popularity",
    series: "pop",
    desc: "Global best-sellers. Higher = push what everyone buys, ignoring who this customer is.",
  },
  {
    key: "association",
    label: "Association",
    series: "assoc",
    desc: "Co-purchase rules (bought-together). Higher = lean on 'people who bought X also bought Y'.",
  },
  {
    key: "collaborative",
    label: "Collaborative",
    series: "collab",
    desc: "Similar customers. Higher = recommend what look-alike shoppers bought.",
  },
  {
    key: "trend",
    label: "Trend",
    series: "trend",
    desc: "Recent acceleration. Higher = favour products gaining momentum in the trend window.",
  },
];

const seriesColor = {
  pop: "var(--color-s-pop)",
  assoc: "var(--color-s-assoc)",
  collab: "var(--color-s-collab)",
  trend: "var(--color-s-trend)",
} as const;

export function QueryPanel() {
  const {
    selectedCustomerId,
    selectedProductId,
    setSelectedCustomerId,
    setSelectedProductId,
    revision,
  } = useObservatoryStore();

  const [entity, setEntity] = useState<Entity>("customer");
  const [k, setK] = useState(8);
  const [windowDays, setWindowDays] = useState(30);
  // Weights are remembered per customer, so tuning one never leaks into another.
  const [weightsByCustomer, setWeightsByCustomer] = useState<
    Record<string, HybridWeights>
  >({});
  const weights = weightsByCustomer[selectedCustomerId] ?? DEFAULT_WEIGHTS;

  const setWeight = (key: keyof HybridWeights, value: number) =>
    setWeightsByCustomer((prev) => ({
      ...prev,
      [selectedCustomerId]: { ...(prev[selectedCustomerId] ?? DEFAULT_WEIGHTS), [key]: value },
    }));

  const resetWeights = () =>
    setWeightsByCustomer((prev) => ({ ...prev, [selectedCustomerId]: DEFAULT_WEIGHTS }));

  const pickers = useAsyncData(
    async () => {
      const [customers, stats] = await Promise.all([
        observatoryApi.customers(),
        observatoryApi.stats(),
      ]);
      return { customers, stats };
    },
    [revision],
  );

  const customerOut = useAsyncData(
    async () => {
      if (entity !== "customer" || !selectedCustomerId) return null;
      const [hybrid, collaborative, embedding, popular, trending] = await Promise.all([
        observatoryApi.hybridRecommendations(selectedCustomerId, k, weights),
        observatoryApi.customerRecommendations(selectedCustomerId, k),
        observatoryApi.embeddingRecommendations(selectedCustomerId, k),
        observatoryApi.popular(k),
        observatoryApi.trending(k, windowDays),
      ]);
      return { hybrid, collaborative, embedding, popular, trending };
    },
    [entity, selectedCustomerId, k, windowDays,
      weights.popularity, weights.association, weights.collaborative, weights.trend, revision],
  );

  const productOut = useAsyncData(
    async () => {
      if (entity !== "product" || !selectedProductId) return null;
      const [associations, similar, coPurchases] = await Promise.all([
        observatoryApi.associations(selectedProductId, k),
        observatoryApi.similarProducts(selectedProductId, k),
        observatoryApi.coPurchases(selectedProductId, k),
      ]);
      return { associations, similar, coPurchases };
    },
    [entity, selectedProductId, k, revision],
  );

  const topHybrid = customerOut.data?.hybrid[0];

  const weightSum = useMemo(
    () => WEIGHT_META.reduce((sum, m) => sum + weights[m.key], 0),
    [weights],
  );

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Query the engine"
        hint="Pick an entity and compare how each strategy ranks it."
        actions={
          <Segmented
            value={entity}
            onChange={(v) => setEntity(v as Entity)}
            options={[
              { value: "customer", label: "Customer" },
              { value: "product", label: "Product" },
            ]}
          />
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {entity === "customer" ? (
            <Select
              label="Customer"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              {(pickers.data?.customers ?? []).map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  {c.customerId} · {c.orderCount} orders
                </option>
              ))}
            </Select>
          ) : (
            <Select
              label="Product"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {(pickers.data?.stats ?? []).map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productId} · {p.purchaseCount} buys
                </option>
              ))}
            </Select>
          )}

          <label className="flex flex-col gap-1.5">
            <span
              className="cursor-help text-[11px] uppercase tracking-[0.14em] text-neutral-500"
              title="How many results each strategy returns."
            >
              Top-K · <span className="tnum text-neutral-300">{k}</span>
            </span>
            <input
              type="range"
              min={1}
              max={12}
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="slider mt-2 w-full"
            />
          </label>
        </div>

        {entity === "customer" && (
          <div className="mt-4 border-t border-line pt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                Hybrid weights
              </span>
              <div className="flex items-center gap-3">
                <span className="tnum text-xs text-neutral-500" title="Sum of the four weights. The blend is normalized, so only the ratio between weights matters.">
                  Σ {weightSum.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={resetWeights}
                  className="text-xs text-accent hover:underline"
                >
                  reset
                </button>
              </div>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-neutral-500">
              How much each strategy counts in the hybrid ranking for{" "}
              <span className="text-neutral-300">{selectedCustomerId || "—"}</span>. Saved
              per customer, so you can boost one and lower another independently. Hover a
              label for what it does.
            </p>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {WEIGHT_META.map((m) => (
                <label key={m.key} className="flex flex-col gap-1.5">
                  <span className="flex items-center justify-between text-xs text-neutral-400">
                    <span
                      className="flex cursor-help items-center gap-2"
                      title={m.desc}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: seriesColor[m.series] }}
                      />
                      {m.label}
                      <span className="text-neutral-600">ⓘ</span>
                    </span>
                    <span className="tnum text-neutral-300">
                      {weights[m.key].toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={weights[m.key]}
                    onChange={(e) => setWeight(m.key, Number(e.target.value))}
                    title={m.desc}
                    className="slider w-full"
                  />
                </label>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-3">
              <span
                className="cursor-help text-[11px] uppercase tracking-[0.14em] text-neutral-500"
                title="Lookback in days for the trend strategy. Recent window vs the prior window sets each product's acceleration."
              >
                Trend window
              </span>
              <input
                type="number"
                min={1}
                value={windowDays}
                onChange={(e) => setWindowDays(Math.max(Number(e.target.value) || 1, 1))}
                className="tnum w-20 rounded-md border border-line bg-panel-2 px-2 py-1.5 text-sm text-white outline-none focus-visible:border-accent"
              />
              <span className="text-xs text-neutral-500">days</span>
            </label>
          </div>
        )}
      </Panel>

      {entity === "customer" ? (
        <>
          <Panel
            title="Hybrid ranking"
            hint={`Weighted blend for ${selectedCustomerId || "—"}`}
          >
            {topHybrid ? (
              <div className="mb-4 rounded-lg border border-line bg-panel-2 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-neutral-400">Top pick</span>
                  <span className="text-base font-semibold text-white">
                    {topHybrid.productId}
                  </span>
                </div>
                <div className="mt-3 flex gap-1.5">
                  {WEIGHT_META.map((m) => {
                    const val = topHybrid.components[m.key];
                    const total =
                      WEIGHT_META.reduce((s, x) => s + topHybrid.components[x.key], 0) || 1;
                    return (
                      <div
                        key={m.key}
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: seriesColor[m.series],
                          width: `${Math.max((val / total) * 100, 1)}%`,
                        }}
                        title={`${m.label}: ${val.toFixed(3)}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {WEIGHT_META.map((m) => (
                    <span key={m.key} className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: seriesColor[m.series] }}
                      />
                      {m.label}
                      <span className="tnum text-neutral-400">
                        {topHybrid.components[m.key].toFixed(2)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <RankedList
              items={(customerOut.data?.hybrid ?? []).map((r) => ({
                label: r.productId,
                value: r.score,
                reason: r.reason,
              }))}
              emptyLabel="No hybrid output yet. Feed the engine or pick another customer."
            />
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <Panel title="Popularity">
              <RankedList
                series="pop"
                items={(customerOut.data?.popular ?? []).map((r) => ({
                  label: r.productId, value: r.score, reason: r.reason,
                }))}
              />
            </Panel>
            <Panel title="Semantic">
              <RankedList
                series="assoc"
                items={(customerOut.data?.embedding ?? []).map((r) => ({
                  label: r.productId, value: r.score, reason: r.reason,
                }))}
                emptyLabel="No semantic signal yet."
              />
            </Panel>
            <Panel title="Collaborative">
              <RankedList
                series="collab"
                items={(customerOut.data?.collaborative ?? []).map((r) => ({
                  label: r.productId, value: r.score, reason: r.reason,
                }))}
                emptyLabel="Needs similar customers."
              />
            </Panel>
            <Panel title="Trending">
              <RankedList
                series="trend"
                items={(customerOut.data?.trending ?? []).map((r) => ({
                  label: r.productId, value: r.trendScore, reason: r.reason,
                }))}
                emptyLabel="No acceleration in window."
              />
            </Panel>
          </div>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Associations" hint="Support · confidence · lift · feedback">
            <RankedList
              series="assoc"
              items={(productOut.data?.associations ?? []).map((r) => ({
                label: r.targetProductId, value: r.adjustedScore, reason: r.reason,
              }))}
            />
          </Panel>
          <Panel title="Similar products">
            <RankedList
              series="collab"
              items={(productOut.data?.similar ?? []).map((r) => ({
                label: r.productId, value: r.score, reason: r.reason,
              }))}
            />
          </Panel>
          <Panel title="Co-purchases">
            {(productOut.data?.coPurchases ?? []).length === 0 ? (
              <Empty>No co-purchases recorded.</Empty>
            ) : (
              <RankedList
                series="pop"
                items={(productOut.data?.coPurchases ?? []).map((e) => ({
                  label: e.relatedProductId,
                  value: e.coPurchaseCount,
                  reason: `${formatCompactNumber(e.coPurchaseCount)} orders together`,
                }))}
              />
            )}
          </Panel>
        </div>
      )}

      {(customerOut.error || productOut.error) && (
        <Panel>
          <p className="text-sm text-s-trend">
            {customerOut.error ?? productOut.error}
          </p>
        </Panel>
      )}
    </div>
  );
}
