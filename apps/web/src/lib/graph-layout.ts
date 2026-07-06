import type { GraphEdge, GraphNode } from "./contracts";

export interface GraphNodePosition extends GraphNode {
  x: number;
  y: number;
  radius: number;
  emphasis: "focus" | "highlight" | "normal";
}

export interface GraphLayout {
  nodes: GraphNodePosition[];
  edges: GraphEdge[];
}

interface BuildGraphLayoutOptions {
  width: number;
  height: number;
  focusId?: string;
  highlightedIds?: string[];
}

function safeNode(
  nodeId: string,
  nodes: Map<string, GraphNode>,
): GraphNode {
  return nodes.get(nodeId) ?? { id: nodeId, purchaseCount: 0, degree: 0 };
}

export function buildGraphLayout(
  inputNodes: GraphNode[],
  inputEdges: GraphEdge[],
  options: BuildGraphLayoutOptions,
): GraphLayout {
  const width = Math.max(options.width, 320);
  const height = Math.max(options.height, 240);
  const highlighted = new Set(options.highlightedIds ?? []);
  const nodesById = new Map(inputNodes.map((node) => [node.id, node]));

  for (const edge of inputEdges) {
    if (!nodesById.has(edge.source)) {
      nodesById.set(edge.source, { id: edge.source, purchaseCount: 0, degree: 0 });
    }
    if (!nodesById.has(edge.target)) {
      nodesById.set(edge.target, { id: edge.target, purchaseCount: 0, degree: 0 });
    }
  }

  const focusId = options.focusId && nodesById.has(options.focusId)
    ? options.focusId
    : undefined;

  if (focusId) {
    const linkedIds = new Set<string>([focusId]);
    for (const edge of inputEdges) {
      if (edge.source === focusId) {
        linkedIds.add(edge.target);
      }
      if (edge.target === focusId) {
        linkedIds.add(edge.source);
      }
    }

    const orderedIds = [...linkedIds].sort((left, right) => {
      if (left === focusId) {
        return -1;
      }
      if (right === focusId) {
        return 1;
      }

      const leftNode = safeNode(left, nodesById);
      const rightNode = safeNode(right, nodesById);

      return (
        rightNode.purchaseCount - leftNode.purchaseCount ||
        rightNode.degree - leftNode.degree ||
        left.localeCompare(right)
      );
    });

    const orbitIds = orderedIds.filter((nodeId) => nodeId !== focusId).slice(0, 8);
    const centerX = width / 2;
    const centerY = height / 2;
    const orbitRadius = Math.min(width, height) * 0.32;
    const positioned = orbitIds.map((nodeId, index) => {
      const angle = (-Math.PI / 2) + (index / Math.max(orbitIds.length, 1)) * Math.PI * 2;
      const node = safeNode(nodeId, nodesById);

      return {
        ...node,
        x: centerX + Math.cos(angle) * orbitRadius,
        y: centerY + Math.sin(angle) * orbitRadius,
        radius: 18 + Math.min(node.purchaseCount, 10) * 1.8,
        emphasis: highlighted.has(node.id) ? "highlight" : "normal",
      } satisfies GraphNodePosition;
    });

    const focusNode = safeNode(focusId, nodesById);
    const nodes = [
      {
        ...focusNode,
        x: centerX,
        y: centerY,
        radius: 28 + Math.min(focusNode.purchaseCount, 12) * 1.6,
        emphasis: "focus",
      } satisfies GraphNodePosition,
      ...positioned,
    ];

    const allowedIds = new Set(nodes.map((node) => node.id));
    const edges = inputEdges.filter(
      (edge) => allowedIds.has(edge.source) && allowedIds.has(edge.target),
    );

    return { nodes, edges };
  }

  const nodes = [...nodesById.values()]
    .sort((left, right) => {
      return (
        right.purchaseCount - left.purchaseCount ||
        right.degree - left.degree ||
        left.id.localeCompare(right.id)
      );
    })
    .slice(0, 12)
    .map((node, index, collection) => {
      const angle = (-Math.PI / 2) + (index / Math.max(collection.length, 1)) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.36;

      return {
        ...node,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        radius: 16 + Math.min(node.purchaseCount, 10) * 1.6,
        emphasis: highlighted.has(node.id) ? "highlight" : "normal",
      } satisfies GraphNodePosition;
    });

  const allowedIds = new Set(nodes.map((node) => node.id));
  const edges = inputEdges.filter(
    (edge) => allowedIds.has(edge.source) && allowedIds.has(edge.target),
  );

  return { nodes, edges };
}
