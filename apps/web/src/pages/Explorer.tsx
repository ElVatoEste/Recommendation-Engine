import { useEffect, useMemo, useState } from "react";

import { GraphScene } from "@/components/GraphScene";
import { ScoreBars } from "@/components/ScoreBars";
import { SectionCard } from "@/components/SectionCard";
import { useAsyncData } from "@/hooks/useAsyncData";
import { observatoryApi } from "@/lib/api";
import type { GraphNode } from "@/lib/contracts";
import {
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
} from "@/lib/format";
import { useObservatoryStore } from "@/store/observatoryStore";

type ExplorerView = "producto" | "cliente";

export default function Explorer() {
  const [view, setView] = useState<ExplorerView>("producto");
  const {
    selectedCustomerId,
    selectedProductId,
    setSelectedCustomerId,
    setSelectedProductId,
  } = useObservatoryStore();

  const baseState = useAsyncData(
    async () => {
      const [stats, customers, graph] = await Promise.all([
        observatoryApi.stats(),
        observatoryApi.customers(),
        observatoryApi.graph(),
      ]);

      return { stats, customers, graph };
    },
    [],
  );

  useEffect(() => {
    if (!baseState.data?.stats.length) {
      return;
    }

    const exists = baseState.data.stats.some(
      (product) => product.productId === selectedProductId,
    );
    if (!exists) {
      setSelectedProductId(baseState.data.stats[0].productId);
    }
  }, [baseState.data?.stats, selectedProductId, setSelectedProductId]);

  useEffect(() => {
    if (!baseState.data?.customers.length) {
      return;
    }

    const exists = baseState.data.customers.some(
      (customer) => customer.customerId === selectedCustomerId,
    );
    if (!exists) {
      setSelectedCustomerId(baseState.data.customers[0].customerId);
    }
  }, [baseState.data?.customers, selectedCustomerId, setSelectedCustomerId]);

  const productState = useAsyncData(
    async () => {
      if (!selectedProductId) {
        return {
          associations: [],
          coPurchases: [],
          similarProducts: [],
        };
      }

      const [coPurchases, associations, similarProducts] = await Promise.all([
        observatoryApi.coPurchases(selectedProductId, 8),
        observatoryApi.associations(selectedProductId, 8),
        observatoryApi.similarProducts(selectedProductId, 8),
      ]);

      return { associations, coPurchases, similarProducts };
    },
    [selectedProductId],
  );

  const customerState = useAsyncData(
    async () => {
      if (!selectedCustomerId) {
        return {
          embedding: [],
          hybrid: [],
          profile: undefined,
          recommendations: [],
          similarCustomers: [],
        };
      }

      const [profile, recommendations, similarCustomers, embedding, hybrid] =
        await Promise.all([
          observatoryApi.customerProfile(selectedCustomerId),
          observatoryApi.customerRecommendations(selectedCustomerId, 8),
          observatoryApi.similarCustomers(selectedCustomerId, 6),
          observatoryApi.embeddingRecommendations(selectedCustomerId, 8),
          observatoryApi.hybridRecommendations(selectedCustomerId, 8),
        ]);

      return {
        embedding,
        hybrid,
        profile,
        recommendations,
        similarCustomers,
      };
    },
    [selectedCustomerId],
  );

  const productNodes = useMemo(() => {
    const statsById = new Map(
      (baseState.data?.stats ?? []).map((item) => [item.productId, item]),
    );
    const nodes: GraphNode[] = [];
    const seen = new Set<string>();

    if (selectedProductId) {
      const focus = statsById.get(selectedProductId);
      nodes.push({
        id: selectedProductId,
        purchaseCount: focus?.purchaseCount ?? 0,
        degree: productState.data?.coPurchases.length ?? 0,
      });
      seen.add(selectedProductId);
    }

    for (const edge of productState.data?.coPurchases ?? []) {
      if (seen.has(edge.relatedProductId)) {
        continue;
      }

      const stat = statsById.get(edge.relatedProductId);
      nodes.push({
        id: edge.relatedProductId,
        purchaseCount: stat?.purchaseCount ?? edge.coPurchaseCount,
        degree: 1,
      });
      seen.add(edge.relatedProductId);
    }

    return nodes;
  }, [baseState.data?.stats, productState.data?.coPurchases, selectedProductId]);

  const productEdges = useMemo(
    () =>
      (productState.data?.coPurchases ?? []).map((edge) => ({
        source: edge.productId,
        target: edge.relatedProductId,
        weight: edge.coPurchaseCount,
      })),
    [productState.data?.coPurchases],
  );

  const topHybrid = customerState.data?.hybrid[0];

  return (
    <div className="stagger space-y-6 pt-2">
      <section className="rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(4,120,87,0.26),rgba(15,23,42,0.94)_40%,rgba(2,8,23,0.96))] p-6 md:p-8 xl:p-10">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/12 px-3 py-1 text-[11px] uppercase tracking-[0.34em] text-emerald-100">
              <span aria-hidden="true">◎</span>
              Explorador de recomendaciones
            </span>
            <h1 className="font-display text-5xl leading-[0.96] text-white md:text-6xl">
              Entra por entidad, sal por explicación.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300">
              Cambia entre producto y cliente para inspeccionar conexiones, rankings
              y composición de score. La idea es que entiendas la recomendación sin
              abrir el código del motor.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="flex flex-wrap gap-3">
              {(["producto", "cliente"] as ExplorerView[]).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setView(entry)}
                  className={`rounded-full border px-4 py-2.5 text-sm transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out-strong)] active:scale-[0.97] ${
                    view === entry
                      ? "border-cyan-300/20 bg-cyan-300 text-slate-950 shadow-[0_12px_30px_-14px_rgba(103,232,249,0.85)]"
                      : "border-white/12 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                >
                  {entry === "producto" ? "Vista producto" : "Vista cliente"}
                </button>
              ))}
            </div>

            <div className="grid gap-3 rounded-[28px] border border-white/10 bg-slate-950/55 p-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Producto foco
                </span>
                <select
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out-strong)] outline-none hover:border-white/20 focus-visible:border-cyan-300/50 focus-visible:ring-2 focus-visible:ring-cyan-300/30"
                >
                  {(baseState.data?.stats ?? []).map((item) => (
                    <option key={item.productId} value={item.productId}>
                      {item.productId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Cliente foco
                </span>
                <select
                  value={selectedCustomerId}
                  onChange={(event) => setSelectedCustomerId(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out-strong)] outline-none hover:border-white/20 focus-visible:border-cyan-300/50 focus-visible:ring-2 focus-visible:ring-cyan-300/30"
                >
                  {(baseState.data?.customers ?? []).map((item) => (
                    <option key={item.customerId} value={item.customerId}>
                      {item.customerId}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </section>

      {view === "producto" ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionCard
              eyebrow="Co-compra"
              title={`Grafo alrededor de ${selectedProductId}`}
              description="Vista radial centrada en el producto seleccionado. Cada arista resume frecuencia de compra conjunta."
            >
              <GraphScene
                nodes={productNodes}
                edges={productEdges}
                focusId={selectedProductId}
                highlightedIds={[selectedProductId]}
                height={360}
              />
            </SectionCard>

            <SectionCard
              eyebrow="Contexto"
              title="Señal del producto"
              description="Métricas rápidas para ubicar el producto foco dentro del motor."
            >
              <div className="grid gap-4 md:grid-cols-3">
                {(() => {
                  const focus = baseState.data?.stats.find(
                    (item) => item.productId === selectedProductId,
                  );

                  return (
                    <>
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                          Compras
                        </p>
                        <p className="mt-3 text-4xl text-white">
                          {formatCompactNumber(focus?.purchaseCount ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                          Cantidad vendida
                        </p>
                        <p className="mt-3 text-4xl text-white">
                          {formatCompactNumber(focus?.quantitySold ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                          Revenue
                        </p>
                        <p className="mt-3 text-4xl text-white">
                          {formatCurrency(focus?.revenue ?? 0)}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              eyebrow="Asociaciones"
              title="Reglas que empujan la recomendación"
              description="Las asociaciones incorporan soporte, confianza, lift y ajuste por feedback."
            >
              <ScoreBars
                items={(productState.data?.associations ?? []).map((item) => ({
                  label: item.targetProductId,
                  value: item.adjustedScore,
                  caption: item.reason,
                  tone: "violet",
                }))}
              />
            </SectionCard>

            <SectionCard
              eyebrow="Similitud"
              title="Productos cercanos"
              description="Vecinos calculados por comportamiento compartido en el espacio del motor."
            >
              <ScoreBars
                items={(productState.data?.similarProducts ?? []).map((item) => ({
                  label: item.productId,
                  value: item.score,
                  caption: item.reason,
                  tone: "emerald",
                }))}
              />
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <SectionCard
              eyebrow="Perfil"
              title={`Cliente ${selectedCustomerId}`}
              description="Resumen del historial y del inventario de afinidades que el motor conoce."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    Ordenes
                  </p>
                  <p className="mt-3 text-4xl text-white">
                    {formatCompactNumber(customerState.data?.profile?.orderCount ?? 0)}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    Spend total
                  </p>
                  <p className="mt-3 text-4xl text-white">
                    {formatCurrency(customerState.data?.profile?.totalSpend ?? 0)}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    Productos únicos
                  </p>
                  <p className="mt-3 text-4xl text-white">
                    {formatCompactNumber(customerState.data?.profile?.uniqueProducts ?? 0)}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    Última actividad
                  </p>
                  <p className="mt-3 text-lg text-white">
                    {formatDateTime(customerState.data?.profile?.lastSeenAt)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Afinidades observadas
                </p>
                <div className="mt-4 space-y-3">
                  {(customerState.data?.profile?.products ?? []).slice(0, 6).map((product) => (
                    <div
                      key={product.productId}
                      className="flex items-center justify-between gap-4 rounded-[20px] border border-white/8 bg-white/[0.02] px-4 py-3"
                    >
                      <span className="text-sm text-slate-100">{product.productId}</span>
                      <span className="text-sm text-slate-400">
                        {formatCompactNumber(product.purchaseCount)} compras
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Score híbrido"
              title="Desglose de la recomendación principal"
              description="Cuando existe una salida híbrida dominante, aquí se muestra cómo se compone por estrategia."
            >
              <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                      Producto líder
                    </p>
                    <p className="mt-2 text-3xl text-white">
                      {topHybrid?.productId ?? "Sin resultado"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {topHybrid?.reason ?? "Todavía no hay combinación híbrida suficiente para este cliente."}
                    </p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-xs uppercase tracking-[0.24em] text-cyan-200">
                    HX
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <ScoreBars
                  items={
                    topHybrid
                      ? [
                          {
                            label: "Popularidad",
                            value: topHybrid.components.popularity,
                            caption: "Peso global del catálogo.",
                            tone: "cyan",
                          },
                          {
                            label: "Asociación",
                            value: topHybrid.components.association,
                            caption: "Relaciones de co-compra y reglas.",
                            tone: "violet",
                          },
                          {
                            label: "Colaborativo",
                            value: topHybrid.components.collaborative,
                            caption: "Clientes con comportamientos parecidos.",
                            tone: "emerald",
                          },
                          {
                            label: "Tendencia",
                            value: topHybrid.components.trend,
                            caption: "Aceleración reciente del producto.",
                            tone: "amber",
                          },
                        ]
                      : []
                  }
                />
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <SectionCard
              eyebrow="Colaborativo"
              title="Recomendaciones por vecinos"
              description="Se construyen desde comportamientos similares."
            >
              <ScoreBars
                items={(customerState.data?.recommendations ?? []).map((item) => ({
                  label: item.productId,
                  value: item.score,
                  caption: item.reason,
                  tone: "cyan",
                }))}
              />
            </SectionCard>

            <SectionCard
              eyebrow="Embedding"
              title="Señal semántica"
              description="Productos cercanos en el espacio vectorial del catálogo."
            >
              <ScoreBars
                items={(customerState.data?.embedding ?? []).map((item) => ({
                  label: item.productId,
                  value: item.score,
                  caption: item.reason,
                  tone: "violet",
                }))}
              />
            </SectionCard>

            <SectionCard
              eyebrow="Vecinos"
              title="Clientes similares"
              description="Sirven para explicar por qué la capa colaborativa confía en ciertos productos."
            >
              <ScoreBars
                items={(customerState.data?.similarCustomers ?? []).map((item) => ({
                  label: item.customerId,
                  value: item.score,
                  caption: `${formatCompactNumber(item.sharedProducts)} productos compartidos`,
                  tone: "emerald",
                }))}
              />
            </SectionCard>
          </div>
        </div>
      )}

      {(baseState.loading || productState.loading || customerState.loading) && (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.025] px-5 py-4 text-sm text-slate-400">
          Cargando datos del explorador...
        </div>
      )}

      {(baseState.error || productState.error || customerState.error) && (
        <div className="rounded-[24px] border border-rose-300/15 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
          {baseState.error ?? productState.error ?? customerState.error}
        </div>
      )}
    </div>
  );
}
