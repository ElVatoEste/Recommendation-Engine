import { useMemo } from "react";
import { Link } from "react-router-dom";

import { GraphScene } from "@/components/GraphScene";
import { PipelineStages } from "@/components/PipelineStages";
import { ScoreBars } from "@/components/ScoreBars";
import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { TimelineRail } from "@/components/TimelineRail";
import { useAsyncData } from "@/hooks/useAsyncData";
import { observatoryApi } from "@/lib/api";
import {
  describeEvent,
  extractEventProducts,
  formatCompactNumber,
  formatDateTime,
  formatPercent,
} from "@/lib/format";
import { useObservatoryStore } from "@/store/observatoryStore";

interface ControlRoomPayload {
  customers: Awaited<ReturnType<typeof observatoryApi.customers>>;
  events: Awaited<ReturnType<typeof observatoryApi.events>>;
  feedback: Awaited<ReturnType<typeof observatoryApi.feedback>>;
  graph: Awaited<ReturnType<typeof observatoryApi.graph>>;
  health: Awaited<ReturnType<typeof observatoryApi.health>>;
  popular: Awaited<ReturnType<typeof observatoryApi.popular>>;
  trending: Awaited<ReturnType<typeof observatoryApi.trending>>;
}

export default function Home() {
  const { latestEvent, liveSnapshot, streamConnected } = useObservatoryStore();
  const { data, loading, error } = useAsyncData<ControlRoomPayload>(
    async () => {
      const [
        health,
        popular,
        trending,
        events,
        graph,
        customers,
        feedback,
      ] = await Promise.all([
        observatoryApi.health(),
        observatoryApi.popular(6),
        observatoryApi.trending(6, 21),
        observatoryApi.events(14),
        observatoryApi.graph(),
        observatoryApi.customers(),
        observatoryApi.feedback(),
      ]);

      return {
        customers,
        events,
        feedback,
        graph,
        health,
        popular,
        trending,
      };
    },
    [],
  );

  const snapshot = liveSnapshot ?? data?.health.snapshot;

  const timelineEvents = useMemo(() => {
    const incoming = data?.events.events ?? [];
    const deduped = [...incoming].reverse();

    if (!latestEvent) {
      return deduped;
    }

    return [
      latestEvent,
      ...deduped.filter((event) => event.id !== latestEvent.id),
    ].slice(0, 14);
  }, [data?.events.events, latestEvent]);

  const averageAcceptance = useMemo(() => {
    const feedback = data?.feedback ?? [];
    if (feedback.length === 0) {
      return 0;
    }

    return (
      feedback.reduce((total, item) => total + item.acceptanceRate, 0) /
      feedback.length
    );
  }, [data?.feedback]);

  const activeStage = latestEvent
    ? latestEvent.type === "PurchaseCreated"
      ? "ranking"
      : latestEvent.type === "RecommendationAccepted" ||
          latestEvent.type === "RecommendationIgnored"
        ? "estadisticas"
        : "ingesta"
    : undefined;

  return (
    <div className="stagger space-y-6 pt-2">
      <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.65),rgba(15,23,42,0.92)_40%,rgba(17,24,39,0.94))] p-6 shadow-[0_28px_100px_rgba(8,47,73,0.35)] md:p-8 xl:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/12 px-3 py-1 text-[11px] uppercase tracking-[0.34em] text-cyan-100">
                <span className="h-2 w-2 rounded-full bg-cyan-200" />
                Control Room
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.28em] ${
                  streamConnected
                    ? "border-emerald-300/20 bg-emerald-400/12 text-emerald-100"
                    : "border-amber-300/20 bg-amber-400/12 text-amber-100"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    streamConnected ? "bg-emerald-300 animate-pulse" : "bg-amber-300"
                  }`}
                />
                {streamConnected ? "Stream conectado" : "Stream inactivo"}
              </span>
            </div>

            <div className="max-w-4xl space-y-4">
              <h1 className="font-display text-5xl leading-[0.95] text-white md:text-6xl xl:text-7xl">
                Mira el algoritmo moverse.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Esta vista convierte el motor en una sala de observación: llegan eventos,
                cambian las afinidades, se refuerza el grafo y el ranking reacciona frente
                a ti.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/laboratorio"
                className="group inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300 px-5 py-3 text-sm font-medium text-slate-950 shadow-[0_14px_36px_-14px_rgba(103,232,249,0.8)] transition-[background-color,transform,box-shadow] duration-200 ease-[var(--ease-out-strong)] hover:-translate-y-0.5 hover:bg-cyan-200 active:scale-[0.97]"
              >
                Abrir laboratorio
                <span aria-hidden="true" className="transition-transform duration-200 ease-[var(--ease-out-strong)] group-hover:translate-x-0.5">→</span>
              </Link>
              <Link
                to="/explorador"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm text-white transition-[background-color,transform] duration-200 ease-[var(--ease-out-strong)] hover:bg-white/[0.08] active:scale-[0.97]"
              >
                Explorar entidades
                <span aria-hidden="true">✦</span>
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Eventos"
                value={formatCompactNumber(snapshot?.totalEvents ?? 0)}
                hint="Señales procesadas por el motor."
                icon={<span className="text-xs uppercase tracking-[0.24em]">EV</span>}
                tone="cyan"
              />
              <StatCard
                label="Compras"
                value={formatCompactNumber(snapshot?.totalPurchases ?? 0)}
                hint="Compras que ya impactaron el grafo."
                icon={<span className="text-xs uppercase tracking-[0.24em]">CP</span>}
                tone="emerald"
              />
              <StatCard
                label="Productos"
                value={formatCompactNumber(snapshot?.uniqueProducts ?? 0)}
                hint="Catálogo activo dentro del snapshot."
                icon={<span className="text-xs uppercase tracking-[0.24em]">PD</span>}
                tone="violet"
              />
              <StatCard
                label="Clientes"
                value={formatCompactNumber(snapshot?.uniqueCustomers ?? 0)}
                hint="Perfiles con señal acumulada."
                icon={<span className="text-xs uppercase tracking-[0.24em]">CL</span>}
                tone="amber"
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-6 backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Latido actual
              </p>
              <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">
                  Último evento
                </p>
                <p className="mt-3 text-lg text-white">
                  {latestEvent ? describeEvent(latestEvent) : "Esperando actividad..."}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {latestEvent
                    ? `${latestEvent.type} · ${formatDateTime(latestEvent.occurredAt)}`
                    : "El stream SSE alimenta esta vista en tiempo real cuando la API emite cambios."}
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                    Storage
                  </p>
                  <p className="mt-2 text-2xl text-white">
                    {data?.health.storageMode ?? "cargando"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {data?.health.storageHealthy
                      ? "La persistencia respondió sin degradación."
                      : "La capa de almacenamiento reporta degradación."}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                    Feedback
                  </p>
                  <p className="mt-2 text-2xl text-white">
                    {formatPercent(averageAcceptance)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Tasa media de aceptación sobre recomendaciones observadas.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                    Estado del servicio
                  </p>
                  <p className="mt-2 text-2xl text-white">{data?.health.status ?? "..."}</p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-xs uppercase tracking-[0.24em] text-cyan-200">
                  DB
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                {loading
                  ? "Cargando snapshot inicial..."
                  : error
                    ? error
                    : "La web usa el estado global del motor y lo mezcla con eventos en streaming para mantener una narrativa viva."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Timeline"
          title="Actividad reciente"
          description="Cada chip representa una señal que entró al motor. La más reciente se resalta en cuanto llega por SSE."
        >
          <TimelineRail
            events={timelineEvents}
            currentEventId={latestEvent?.id}
          />
        </SectionCard>

        <SectionCard
          eyebrow="Mini mapa"
          title="Grafo vivo del sistema"
          description="Una proyección rápida de las relaciones de co-compra más fuertes dentro del snapshot actual."
        >
          <GraphScene
            nodes={data?.graph.nodes ?? []}
            edges={data?.graph.edges ?? []}
            highlightedIds={latestEvent ? extractEventProducts(latestEvent) : undefined}
          />
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Pipeline"
        title="Cómo se mueve el algoritmo"
        description="La narrativa de la interfaz sigue exactamente este orden causal: entra el evento, cambian los agregados, se ajusta el grafo y termina recalculándose el ranking."
      >
        <PipelineStages activeStage={activeStage} />
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          eyebrow="Popularidad"
          title="Productos que dominan el ranking"
          description="Señales fuertes por volumen de compra dentro del snapshot actual."
        >
          <ScoreBars
            items={(data?.popular ?? []).map((item) => ({
              label: item.productId,
              value: item.score,
              caption: item.reason,
              tone: "cyan",
            }))}
          />
        </SectionCard>

        <SectionCard
          eyebrow="Tendencia"
          title="Productos acelerando"
          description="Lectura de crecimiento relativo entre ventanas recientes y previas."
        >
          <ScoreBars
            items={(data?.trending ?? []).map((item) => ({
              label: item.productId,
              value: item.trendScore,
              caption: item.reason,
              tone: "emerald",
            }))}
          />
        </SectionCard>
      </div>
    </div>
  );
}
