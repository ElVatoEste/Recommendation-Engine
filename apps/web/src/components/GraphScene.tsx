import type { GraphEdge, GraphNode } from "@/lib/contracts";
import { buildGraphLayout } from "@/lib/graph-layout";

interface GraphSceneProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  focusId?: string;
  highlightedIds?: string[];
  height?: number;
}

const emphasisClassMap = {
  focus: "fill-accent stroke-amber-100",
  highlight: "fill-[var(--color-s-collab)] stroke-emerald-100",
  normal: "fill-neutral-700 stroke-neutral-300/80",
} as const;

export function GraphScene({
  nodes,
  edges,
  focusId,
  highlightedIds,
  height = 320,
}: GraphSceneProps) {
  const layout = buildGraphLayout(nodes, edges, {
    width: 760,
    height,
    focusId,
    highlightedIds,
  });
  const positions = new Map(layout.nodes.map((node) => [node.id, node]));

  if (layout.nodes.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-line bg-panel-2 text-sm text-neutral-500">
        No hay nodos suficientes para renderizar el grafo todavía.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-panel-2">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-25" />
      <svg
        viewBox={`0 0 760 ${height}`}
        className="relative h-full min-h-[320px] w-full"
        role="img"
        aria-label="Grafo de relaciones entre productos"
      >
        {layout.edges.map((edge) => {
          const source = positions.get(edge.source);
          const target = positions.get(edge.target);

          if (!source || !target) {
            return null;
          }

          return (
            <g key={`${edge.source}-${edge.target}`}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="rgba(245, 165, 36, 0.26)"
                strokeWidth={1 + edge.weight * 0.9}
                strokeLinecap="round"
              />
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="rgba(255, 255, 255, 0.18)"
                strokeWidth="1"
                strokeDasharray="7 10"
                strokeLinecap="round"
                className="animate-[dash_18s_linear_infinite]"
              />
            </g>
          );
        })}

        {layout.nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <circle
              r={node.radius + 9}
              className={
                node.emphasis === "focus"
                  ? "fill-accent/15 animate-pulse"
                  : "fill-white/5"
              }
            />
            <circle
              r={node.radius}
              className={`${emphasisClassMap[node.emphasis]} stroke-[1.5]`}
            />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              className="fill-slate-950 text-[12px] font-semibold"
            >
              {node.id}
            </text>
            <text
              x="0"
              y={node.radius + 18}
              textAnchor="middle"
              className="fill-slate-300 text-[10px] uppercase tracking-[0.24em]"
            >
              {node.purchaseCount} compras
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
