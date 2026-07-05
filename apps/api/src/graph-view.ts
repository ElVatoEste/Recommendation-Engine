/**
 * Self-contained HTML page that fetches /graph and renders the co-purchase
 * graph with a small force-directed layout. No external dependencies.
 */
export const GRAPH_VIEW_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Co-purchase graph</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; height: 100vh; overflow: hidden;
    background: radial-gradient(1200px 600px at 70% -10%, #0f2138 0%, #0a111e 60%);
    color: #e2e8f0; font: 14px/1.4 "Segoe UI", system-ui, sans-serif;
  }
  header {
    position: fixed; top: 0; left: 0; right: 0; padding: 14px 20px;
    display: flex; align-items: baseline; gap: 14px;
    background: linear-gradient(#0a111eee, #0a111e00);
    z-index: 2; pointer-events: none;
  }
  header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
  header .meta { color: #7c8aa0; font-size: 13px; }
  .hint { position: fixed; bottom: 12px; left: 20px; color: #5c6b80; font-size: 12px; }
  .empty {
    position: fixed; inset: 0; display: grid; place-items: center;
    color: #7c8aa0; font-size: 15px;
  }
  svg { width: 100vw; height: 100vh; display: block; }
  .edge { stroke: #38506e; stroke-opacity: 0.5; }
  .edge.hot { stroke: #38bdf8; stroke-opacity: 0.9; }
  .node circle { fill: #0b2036; stroke: #60a5fa; stroke-width: 2; cursor: grab; }
  .node.hot circle { stroke: #38bdf8; fill: #103351; }
  .node text { fill: #e2e8f0; font-weight: 600; text-anchor: middle; pointer-events: none; }
  .weight { fill: #64748b; font-size: 11px; text-anchor: middle; pointer-events: none; }
</style>
</head>
<body>
<header>
  <h1>Co-purchase graph</h1>
  <span class="meta" id="meta">loading…</span>
  <span class="meta" id="live"></span>
</header>
<svg id="canvas"></svg>
<div class="hint">drag nodes • hover to highlight • thickness = co-purchase weight • size = purchases</div>
<script>
const SVGNS = "http://www.w3.org/2000/svg";

let activeDrag = null;
let activeRender = () => {};

function draw(graph) {
  const svg = document.getElementById("canvas");
  const meta = document.getElementById("meta");
  svg.innerHTML = "";
  document.querySelectorAll(".empty").forEach((el) => el.remove());

  if (!graph.nodes || graph.nodes.length === 0) {
    meta.textContent = "no data";
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No co-purchase data yet. Seed some purchases first.";
    document.body.appendChild(empty);
    return;
  }

  meta.textContent = graph.nodes.length + " products · " + graph.edges.length + " edges";

  const W = window.innerWidth, H = window.innerHeight;
  const nodes = graph.nodes.map((n, i) => ({
    ...n,
    x: W / 2 + Math.cos((i / graph.nodes.length) * 2 * Math.PI) * Math.min(W, H) * 0.32,
    y: H / 2 + Math.sin((i / graph.nodes.length) * 2 * Math.PI) * Math.min(W, H) * 0.32,
    vx: 0, vy: 0,
  }));
  const index = new Map(nodes.map((n) => [n.id, n]));
  const edges = graph.edges.map((e) => ({ ...e, s: index.get(e.source), t: index.get(e.target) }));
  const maxWeight = Math.max(1, ...edges.map((e) => e.weight));
  const maxPurchase = Math.max(1, ...nodes.map((n) => n.purchaseCount));

  // Force-directed relaxation: repulsion between nodes, springs along edges.
  for (let iter = 0; iter < 320; iter++) {
    for (const a of nodes) {
      for (const b of nodes) {
        if (a === b) continue;
        let dx = a.x - b.x, dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const rep = 9000 / (dist * dist);
        a.vx += (dx / dist) * rep;
        a.vy += (dy / dist) * rep;
      }
      a.vx += (W / 2 - a.x) * 0.01;
      a.vy += (H / 2 - a.y) * 0.01;
    }
    for (const e of edges) {
      let dx = e.t.x - e.s.x, dy = e.t.y - e.s.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const spring = (dist - 170) * 0.02 * (0.5 + e.weight / maxWeight);
      const fx = (dx / dist) * spring, fy = (dy / dist) * spring;
      e.s.vx += fx; e.s.vy += fy; e.t.vx -= fx; e.t.vy -= fy;
    }
    for (const n of nodes) {
      n.x += Math.max(-12, Math.min(12, n.vx));
      n.y += Math.max(-12, Math.min(12, n.vy));
      n.x = Math.max(60, Math.min(W - 60, n.x));
      n.y = Math.max(80, Math.min(H - 40, n.y));
      n.vx *= 0.85; n.vy *= 0.85;
    }
  }

  const edgeEls = edges.map((e) => {
    const line = document.createElementNS(SVGNS, "line");
    line.setAttribute("class", "edge");
    line.setAttribute("stroke-width", String(1 + (e.weight / maxWeight) * 7));
    svg.appendChild(line);
    const label = document.createElementNS(SVGNS, "text");
    label.setAttribute("class", "weight");
    label.textContent = String(e.weight);
    svg.appendChild(label);
    return { e, line, label };
  });

  const nodeEls = nodes.map((n) => {
    const g = document.createElementNS(SVGNS, "g");
    g.setAttribute("class", "node");
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("r", String(16 + (n.purchaseCount / maxPurchase) * 22));
    const label = document.createElementNS(SVGNS, "text");
    label.setAttribute("dy", "4");
    label.textContent = n.id;
    g.appendChild(c); g.appendChild(label);
    svg.appendChild(g);
    return { n, g, c, label };
  });

  const neighbors = new Map(nodes.map((n) => [n.id, new Set()]));
  for (const e of edges) {
    neighbors.get(e.source).add(e.target);
    neighbors.get(e.target).add(e.source);
  }

  function render() {
    for (const { e, line, label } of edgeEls) {
      line.setAttribute("x1", e.s.x); line.setAttribute("y1", e.s.y);
      line.setAttribute("x2", e.t.x); line.setAttribute("y2", e.t.y);
      label.setAttribute("x", (e.s.x + e.t.x) / 2);
      label.setAttribute("y", (e.s.y + e.t.y) / 2 - 4);
    }
    for (const { n, g } of nodeEls) {
      g.setAttribute("transform", "translate(" + n.x + "," + n.y + ")");
    }
  }
  render();
  activeRender = render;

  function highlight(id) {
    const near = neighbors.get(id) ?? new Set();
    for (const { n, g } of nodeEls) {
      g.classList.toggle("hot", id !== null && (n.id === id || near.has(n.id)));
    }
    for (const { e, line } of edgeEls) {
      line.classList.toggle("hot", id !== null && (e.source === id || e.target === id));
    }
  }

  for (const item of nodeEls) {
    item.g.addEventListener("mouseenter", () => { if (!activeDrag) highlight(item.n.id); });
    item.g.addEventListener("mouseleave", () => { if (!activeDrag) highlight(null); });
    item.g.addEventListener("mousedown", (ev) => { activeDrag = item.n; highlight(item.n.id); ev.preventDefault(); });
  }
}

// Drag handling lives at window scope so redraws (live updates) don't stack listeners.
window.addEventListener("mousemove", (ev) => {
  if (!activeDrag) return;
  activeDrag.x = ev.clientX;
  activeDrag.y = ev.clientY;
  activeRender();
});
window.addEventListener("mouseup", () => { activeDrag = null; });

async function load() {
  const res = await fetch("/graph");
  draw(await res.json());
}

let reloadTimer = null;
async function main() {
  await load();
  const live = document.getElementById("live");
  try {
    const source = new EventSource("/events/stream");
    source.onopen = () => { live.textContent = "● live"; live.style.color = "#4ade80"; };
    source.onmessage = () => {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(load, 500);
    };
    source.onerror = () => { live.textContent = "○ reconnecting"; live.style.color = "#64748b"; };
  } catch (err) {
    /* EventSource unsupported; static view still works. */
  }
}

main().catch((err) => {
  document.getElementById("meta").textContent = "failed to load: " + err.message;
});
</script>
</body>
</html>`;
