interface PipelineStagesProps {
  activeStage?: "ingesta" | "estadisticas" | "grafo" | "ranking";
}

const stages = [
  {
    id: "ingesta",
    title: "Ingesta",
    description: "El evento entra al motor y se normaliza.",
  },
  {
    id: "estadisticas",
    title: "Estadísticas",
    description: "Se actualizan contadores, señales y afinidades.",
  },
  {
    id: "grafo",
    title: "Grafo",
    description: "Las relaciones de co-compra ganan o pierden peso.",
  },
  {
    id: "ranking",
    title: "Ranking",
    description: "Popularidad, asociaciones y capas híbridas reordenan la salida.",
  },
] as const;

export function PipelineStages({ activeStage }: PipelineStagesProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-4">
      {stages.map((stage, index) => {
        const active = stage.id === activeStage;
        return (
          <article
            key={stage.id}
            className={`relative overflow-hidden rounded-xl border p-5 transition-[background-color,border-color,transform,box-shadow] duration-300 ease-[var(--ease-out-strong)] ${
              active
                ? "-translate-y-0.5 border-accent/30 bg-accent/[0.08] shadow-[0_18px_44px_-20px_rgba(245,165,36,0.6)]"
                : "border-line bg-panel-2 hover:border-line-strong"
            }`}
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                0{index + 1}
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  active
                    ? "bg-accent shadow-[0_0_20px_rgba(245,165,36,0.8)]"
                    : "bg-white/15"
                }`}
              />
            </div>
            <h3 className="font-display text-xl text-white">{stage.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {stage.description}
            </p>
          </article>
        );
      })}
    </div>
  );
}
