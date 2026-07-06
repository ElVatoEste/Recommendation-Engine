import { useMemo } from "react";

import { GraphScene } from "@/components/GraphScene";
import { PipelineStages } from "@/components/PipelineStages";
import { SectionCard } from "@/components/SectionCard";
import { TimelineRail } from "@/components/TimelineRail";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useSimulationPlayer } from "@/hooks/useSimulationPlayer";
import { observatoryApi } from "@/lib/api";
import { buildSimulationSteps } from "@/lib/simulation";
import { formatCompactNumber, formatEventType } from "@/lib/format";

export default function Laboratory() {
  const { data, loading, error } = useAsyncData(
    () => observatoryApi.events(40),
    [],
  );

  const orderedEvents = useMemo(
    () => [...(data?.events ?? [])].reverse(),
    [data?.events],
  );
  const steps = useMemo(() => buildSimulationSteps(orderedEvents), [orderedEvents]);
  const player = useSimulationPlayer(steps);
  const currentStep = player.currentStep;

  const deltaEvents = currentStep
    ? currentStep.after.totalEvents - currentStep.before.totalEvents
    : 0;
  const deltaPurchases = currentStep
    ? currentStep.after.totalPurchases - currentStep.before.totalPurchases
    : 0;
  const deltaProducts = currentStep
    ? currentStep.after.uniqueProducts - currentStep.before.uniqueProducts
    : 0;

  return (
    <div className="stagger space-y-6 pt-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Step playback
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Replay real engine events one at a time and watch the aggregates, graph
            and ranking shift at each step.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel px-4 py-3 text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Player
          </p>
          <p className="tnum mt-1 text-2xl font-semibold text-white">
            {loading
              ? "…"
              : currentStep
                ? `${player.currentIndex + 1} / ${steps.length}`
                : "0"}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {error
              ? error
              : currentStep
                ? `${formatEventType(currentStep.event.type)} · ${currentStep.stage}`
                : "Needs events to build playback."}
          </p>
        </div>
      </div>

      <SectionCard
        eyebrow="Playback"
        title="Controles de simulación"
        description="El scrubber recorre la secuencia procesada. Puedes detenerte en cualquier punto y observar el estado exacto del grafo y los agregados."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => player.setPlaying(!player.playing)}
              disabled={steps.length <= 1}
              className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent px-4 py-2.5 text-sm font-medium text-black transition-[background-color,transform,opacity] duration-200 ease-[var(--ease-out-strong)] hover:bg-amber-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            >
              <span aria-hidden="true">{player.playing ? "▌▌" : "▶"}</span>
              {player.playing ? "Pausar" : "Reproducir"}
            </button>
            <button
              type="button"
              onClick={player.previous}
              disabled={player.currentIndex === 0}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm text-white transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out-strong)] hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            >
              <span aria-hidden="true">◀</span>
              Paso anterior
            </button>
            <button
              type="button"
              onClick={player.next}
              disabled={player.currentIndex >= steps.length - 1}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm text-white transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out-strong)] hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            >
              <span aria-hidden="true">▶</span>
              Siguiente paso
            </button>
            <button
              type="button"
              onClick={player.reset}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm text-white transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out-strong)] hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.97]"
            >
              <span aria-hidden="true">↺</span>
              Reiniciar
            </button>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(steps.length - 1, 0)}
            value={player.currentIndex}
            onChange={(event) => player.setCurrentIndex(Number(event.target.value))}
            className="slider w-full"
            aria-label="Posición actual de la simulación"
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Pipeline"
        title="Etapa activa"
        description="El laboratorio sigue la secuencia causal del motor. La etapa resaltada marca dónde está ocurriendo el impacto principal del evento actual."
      >
        <PipelineStages activeStage={currentStep?.stage} />
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Paso actual"
          title={currentStep ? formatEventType(currentStep.event.type) : "Esperando datos"}
          description="Lectura antes y después del evento activo, con foco en cambios agregados y productos resaltados."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Eventos
              </p>
              <p className="mt-3 text-4xl text-white">
                +{formatCompactNumber(deltaEvents)}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {currentStep?.before.totalEvents ?? 0} → {currentStep?.after.totalEvents ?? 0}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Compras
              </p>
              <p className="mt-3 text-4xl text-white">
                +{formatCompactNumber(deltaPurchases)}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {currentStep?.before.totalPurchases ?? 0} → {currentStep?.after.totalPurchases ?? 0}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Productos
              </p>
              <p className="mt-3 text-4xl text-white">
                {deltaProducts >= 0 ? "+" : ""}
                {formatCompactNumber(deltaProducts)}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {currentStep?.before.uniqueProducts ?? 0} → {currentStep?.after.uniqueProducts ?? 0}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Explicación
            </p>
            <div className="mt-4 space-y-3">
              {(currentStep?.reasons ?? ["No hay explicación disponible."]).map((reason) => (
                <div
                  key={reason}
                  className="rounded-[20px] border border-white/8 bg-white/[0.02] px-4 py-3 text-sm leading-6 text-slate-300"
                >
                  {reason}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Grafo"
          title="Propagación visual"
          description="Los nodos iluminados reflejan los productos tocados por el evento. Cuando hay compra, las aristas crecen y el centro de gravedad del grafo se mueve."
        >
          <GraphScene
            nodes={currentStep?.graph.nodes ?? []}
            edges={currentStep?.graph.edges ?? []}
            highlightedIds={currentStep?.highlightedProductIds}
            focusId={currentStep?.highlightedProductIds[0]}
            height={340}
          />
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Secuencia"
        title="Rail completo de eventos"
        description="Puedes seguir la simulación línea por línea y cruzarla con el índice del playback."
      >
        <TimelineRail
          events={orderedEvents}
          currentEventId={currentStep?.event.id}
        />
      </SectionCard>
    </div>
  );
}
