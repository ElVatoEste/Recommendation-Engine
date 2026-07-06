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
  focus: "fill-cyan-300 stroke-cyan-100",
  highlight: "fill-emerald-300 stroke-emerald-100",
  normal: "fill-slate-700 stroke-slate-200/80",
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
      <div className="flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.025] text-sm text-slate-500">
        No hay nodos suficientes para renderizar el grafo todavía.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-25" />
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
                stroke="rgba(125, 211, 252, 0.28)"
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
                  ? "fill-cyan-400/15 animate-pulse"
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
