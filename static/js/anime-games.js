import { animate, stagger } from "https://cdn.jsdelivr.net/npm/animejs@4.2.2/+esm";
import {
  forceCollide,
  forceManyBody,
  forceRadial,
  forceSimulation,
  select,
  zoom,
  zoomIdentity,
} from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const worldWidth = 6000;
const worldHeight = 5000;
const worldCenter = { x: worldWidth / 2, y: worldHeight / 2 };
const map = document.querySelector("[data-mind-map]");
const world = document.querySelector("[data-mind-world]");
const lines = document.querySelector("[data-mind-lines]");
const hub = document.querySelector(".mind-hub");
const nodeContainer = document.querySelector("[data-mind-nodes]");
const viewer = document.querySelector("[data-memory-viewer]");
const detail = document.querySelector("[data-memory-detail]");
const emptyHint = document.querySelector("[data-mind-empty]");
const records = readRecords();
let simulation;
let viewTransform = zoomIdentity;

const kindColors = [
  "#e45b8f",
  "#765fe6",
  "#df7b32",
  "#20a486",
  "#d44f5f",
  "#4f7ee8",
  "#168fbd",
  "#5a9d42",
  "#8b5bc4",
  "#c28c16",
];

world.style.width = `${worldWidth}px`;
world.style.height = `${worldHeight}px`;
lines.setAttribute("viewBox", `0 0 ${worldWidth} ${worldHeight}`);
hub.style.left = `${worldCenter.x}px`;
hub.style.top = `${worldCenter.y}px`;

function readRecords() {
  try {
    const data = document.querySelector("[data-hobbyverse-data]");
    const parsed = JSON.parse(data?.textContent || "[]");
    const value = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[character]));
}

function colorForKind(kind) {
  const hash = Array.from(String(kind || "")).reduce(
    (total, character) => ((total * 31) + character.codePointAt(0)) | 0,
    0,
  );
  return kindColors[Math.abs(hash) % kindColors.length];
}

function initialPosition(index) {
  const angle = index * 137.508 * Math.PI / 180;
  const radius = 320 + Math.floor(index / 8) * 240;
  return {
    x: worldCenter.x + Math.cos(angle) * radius,
    y: worldCenter.y + Math.sin(angle) * radius,
  };
}

function updateScene(nodes) {
  nodes.forEach((node) => {
    node.x = Math.max(150, Math.min(worldWidth - 150, node.x));
    node.y = Math.max(80, Math.min(worldHeight - 80, node.y));
    node.element.style.left = `${node.x}px`;
    node.element.style.top = `${node.y}px`;
  });

  lines.replaceChildren();
  nodes.forEach((node) => {
    const curve = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const middleX = (worldCenter.x + node.x) / 2;
    curve.setAttribute(
      "d",
      `M ${worldCenter.x} ${worldCenter.y} C ${middleX} ${worldCenter.y}, ${middleX} ${node.y}, ${node.x} ${node.y}`,
    );
    curve.style.stroke = node.element.style.getPropertyValue("--node-color");
    lines.appendChild(curve);
  });
}

function render() {
  if (simulation) simulation.stop();
  nodeContainer.replaceChildren();

  const nodes = records.map((record, index) => {
    const fallback = initialPosition(index);
    const hasPosition = Number.isFinite(record.x) && Number.isFinite(record.y);
    const position = hasPosition ? { x: record.x, y: record.y } : fallback;
    const button = document.createElement("button");
    const kind = String(record.kind || "Hobby");

    button.type = "button";
    button.className = "memory-node";
    button.dataset.memoryId = String(record.id || index);
    button.style.setProperty("--node-color", colorForKind(kind));
    button.innerHTML = `
      ${record.image ? `<img src="${escapeHtml(record.image)}" alt="">` : `<span class="memory-node-symbol">${escapeHtml(Array.from(kind)[0]?.toUpperCase() || "H")}</span>`}
      <span class="memory-node-copy">
        <small>${escapeHtml(kind)}</small>
        <strong>${escapeHtml(record.title)}</strong>
      </span>
    `;
    nodeContainer.appendChild(button);

    return {
      record,
      element: button,
      index,
      x: position.x,
      y: position.y,
      fx: hasPosition ? position.x : null,
      fy: hasPosition ? position.y : null,
    };
  });

  emptyHint.hidden = records.length > 0;
  updateScene(nodes);

  const hubNode = {
    isHub: true,
    x: worldCenter.x,
    y: worldCenter.y,
    fx: worldCenter.x,
    fy: worldCenter.y,
  };

  simulation = forceSimulation([...nodes, hubNode])
    .force("charge", forceManyBody().strength((node) => node.isHub ? -900 : -260))
    .force("collision", forceCollide().radius((node) => node.isHub ? 150 : 128).iterations(3))
    .force(
      "orbit",
      forceRadial(
        (node) => node.isHub ? 0 : 320 + Math.floor(node.index / 8) * 240,
        worldCenter.x,
        worldCenter.y,
      ).strength((node) => node.isHub || node.fx !== null ? 0 : 0.17),
    )
    .alphaDecay(0.045)
    .on("tick", () => updateScene(nodes));

  if (nodes.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    animate(nodes.map((node) => node.element), {
      opacity: [0, 1],
      delay: stagger(45),
      duration: 420,
      ease: "outQuad",
    });
  }
}

const zoomBehavior = zoom()
  .scaleExtent([0.3, 1.8])
  .filter((event) => {
    if (event.target.closest("button")) return false;
    return !event.ctrlKey || event.type === "wheel";
  })
  .on("zoom", (event) => {
    viewTransform = event.transform;
    world.style.transform = `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.k})`;
  });

function resetView() {
  const scale = window.matchMedia("(max-width: 760px)").matches ? 0.72 : 1;
  const transform = zoomIdentity
    .translate(map.clientWidth / 2, map.clientHeight / 2)
    .scale(scale)
    .translate(-worldCenter.x, -worldCenter.y);
  select(map).call(zoomBehavior.transform, transform);
}

select(map).call(zoomBehavior).on("dblclick.zoom", null);
document.querySelector("[data-zoom-in]").addEventListener("click", () => {
  select(map).call(zoomBehavior.scaleBy, 1.22);
});
document.querySelector("[data-zoom-out]").addEventListener("click", () => {
  select(map).call(zoomBehavior.scaleBy, 0.82);
});
document.querySelector("[data-reset-view]").addEventListener("click", resetView);
document.querySelector("[data-close-viewer]").addEventListener("click", () => viewer.close());

map.addEventListener("click", (event) => {
  const node = event.target.closest("[data-memory-id]");
  if (!node) return;
  const record = records.find(
    (item, index) => String(item.id || index) === node.dataset.memoryId,
  );
  if (!record) return;
  detail.innerHTML = `
    ${record.image ? `<img src="${escapeHtml(record.image)}" alt="">` : ""}
    <p>${escapeHtml(record.kind || "Hobby")}</p>
    <h2>${escapeHtml(record.title)}</h2>
    ${record.note ? `<blockquote>${escapeHtml(record.note)}</blockquote>` : ""}
  `;
  viewer.showModal();
});

window.addEventListener("resize", resetView);
resetView();
render();
