import { animate, stagger } from "https://cdn.jsdelivr.net/npm/animejs@4.2.2/+esm";
import {
  drag,
  forceCollide,
  forceManyBody,
  forceRadial,
  forceSimulation,
  select,
  zoom,
  zoomIdentity,
} from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const storageKey = "fresh-anime-games";
const worldWidth = 6000;
const worldHeight = 5000;
const worldCenter = { x: worldWidth / 2, y: worldHeight / 2 };
const map = document.querySelector("[data-mind-map]");
const world = document.querySelector("[data-mind-world]");
const lines = document.querySelector("[data-mind-lines]");
const hub = document.querySelector(".mind-hub");
const nodeContainer = document.querySelector("[data-mind-nodes]");
const dialog = document.querySelector("[data-memory-dialog]");
const form = document.querySelector("[data-memory-form]");
const viewer = document.querySelector("[data-memory-viewer]");
const detail = document.querySelector("[data-memory-detail]");
const emptyHint = document.querySelector("[data-mind-empty]");
const kindInput = document.querySelector("[data-kind-input]");
const kindSuggestions = document.querySelector("[data-kind-suggestions]");
const imageInput = form.querySelector('input[name="image"]');
const coverPreview = document.querySelector("[data-cover-preview]");
const coverLabel = document.querySelector("[data-cover-label]");
let records = readRecords();
let imageData = "";
let activeId = "";
let simulation;
let viewTransform = zoomIdentity;

const defaultKinds = ["Anime", "Game"];
const kindColors = ["#e45b8f", "#765fe6", "#df7b32", "#20a486", "#d44f5f", "#4f7ee8", "#168fbd", "#5a9d42", "#8b5bc4", "#c28c16"];

world.style.width = `${worldWidth}px`;
world.style.height = `${worldHeight}px`;
lines.setAttribute("viewBox", `0 0 ${worldWidth} ${worldHeight}`);
hub.style.left = `${worldCenter.x}px`;
hub.style.top = `${worldCenter.y}px`;

function readRecords() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(value)) return [];
    return value.map(({ tag, ...record }) => ({
      ...record,
      kind: String(tag || record.kind || "Anime"),
    }));
  } catch {
    return [];
  }
}

function saveRecords() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[character]));
}

function availableKinds() {
  return [...new Set([
    ...defaultKinds,
    ...records.map((record) => record.kind).filter(Boolean),
  ])];
}

function colorForKind(kind) {
  const hash = Array.from(String(kind || "")).reduce(
    (total, character) => ((total * 31) + character.codePointAt(0)) | 0,
    0,
  );
  return kindColors[Math.abs(hash) % kindColors.length];
}

function renderKindSuggestions() {
  kindSuggestions.replaceChildren();
  availableKinds().forEach((kind) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = kind;
    button.addEventListener("click", () => {
      kindInput.value = kind;
      kindInput.focus();
    });
    kindSuggestions.appendChild(button);
  });
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

function buildDragBehavior() {
  return drag()
    .on("start", (event, node) => {
      event.sourceEvent.stopPropagation();
      node.dragDistance = 0;
      node.element.dataset.dragged = "false";
      node.fx = node.x;
      node.fy = node.y;
      if (!event.active) simulation.alphaTarget(0.16).restart();
    })
    .on("drag", (event, node) => {
      node.dragDistance += Math.abs(event.dx) + Math.abs(event.dy);
      node.fx = event.x;
      node.fy = event.y;
      if (node.dragDistance > 4) node.element.dataset.dragged = "true";
    })
    .on("end", (event, node) => {
      if (!event.active) simulation.alphaTarget(0);
      node.record.position = { x: node.fx, y: node.fy };
      saveRecords();
      window.setTimeout(() => {
        node.element.dataset.dragged = "false";
      }, 80);
    });
}

function render() {
  if (simulation) simulation.stop();
  nodeContainer.replaceChildren();

  const orderedRecords = [...records]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const nodes = orderedRecords.map((record, index) => {
    const fallback = initialPosition(index);
    const savedPosition = record.position || fallback;
    const button = document.createElement("button");
    const nodeColor = colorForKind(record.kind);

    button.type = "button";
    button.className = "memory-node";
    button.dataset.memoryId = record.id;
    button.style.setProperty("--node-color", nodeColor);
    button.innerHTML = `
      ${record.image ? `<img src="${record.image}" alt="">` : `<span class="memory-node-symbol">${escapeHtml(Array.from(record.kind || "?")[0].toUpperCase())}</span>`}
      <span class="memory-node-copy">
        <small>${escapeHtml(record.kind)}</small>
        <strong>${escapeHtml(record.title)}</strong>
      </span>
    `;
    nodeContainer.appendChild(button);

    return {
      record,
      element: button,
      index,
      x: savedPosition.x,
      y: savedPosition.y,
      fx: record.position ? savedPosition.x : null,
      fy: record.position ? savedPosition.y : null,
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
      ).strength((node) => node.isHub ? 0 : 0.17),
    )
    .alphaDecay(0.045)
    .on("tick", () => updateScene(nodes))
    .on("end", () => {
      nodes.forEach((node) => {
        if (!node.record.position) node.record.position = { x: node.x, y: node.y };
      });
      saveRecords();
    });

  const behavior = buildDragBehavior();
  nodes.forEach((node) => {
    select(node.element).datum(node).call(behavior);
  });

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

function openComposer() {
  form.reset();
  imageData = "";
  coverPreview.style.backgroundImage = "";
  coverPreview.classList.remove("has-image");
  coverLabel.textContent = "添加一张封面";
  document.querySelector("[data-memory-error]").hidden = true;
  renderKindSuggestions();
  kindInput.value = availableKinds()[0] || "";
  dialog.showModal();
  kindInput.focus();
}

document.querySelectorAll("[data-open-memory]").forEach((trigger) => {
  trigger.addEventListener("click", openComposer);
});
document.querySelector("[data-close-memory]").addEventListener("click", () => dialog.close());
document.querySelector("[data-close-viewer]").addEventListener("click", () => viewer.close());

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", reject);
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("error", reject);
      image.addEventListener("load", () => {
        const maxSize = 720;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.78));
      });
      image.src = reader.result;
    });
    reader.readAsDataURL(file);
  });
}

imageInput.addEventListener("change", async () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  coverLabel.textContent = "正在处理图片...";
  try {
    imageData = await compressImage(file);
    coverPreview.style.backgroundImage = `url("${imageData}")`;
    coverPreview.classList.add("has-image");
    coverLabel.textContent = file.name;
  } catch {
    imageData = "";
    coverLabel.textContent = "图片读取失败，请重新选择";
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const error = document.querySelector("[data-memory-error]");
  const record = {
    id: crypto.randomUUID(),
    title: data.get("title"),
    kind: String(data.get("kind") || "").trim(),
    note: data.get("note"),
    image: imageData,
    createdAt: new Date().toISOString(),
  };
  records.push(record);
  if (!saveRecords()) {
    records = records.filter((item) => item.id !== record.id);
    error.textContent = "保存失败，请尝试使用更小的图片。";
    error.hidden = false;
    return;
  }
  dialog.close();
  render();
});

map.addEventListener("click", (event) => {
  const node = event.target.closest("[data-memory-id]");
  if (!node || node.dataset.dragged === "true") return;
  const record = records.find((item) => item.id === node.dataset.memoryId);
  if (!record) return;
  activeId = record.id;
  detail.innerHTML = `
    ${record.image ? `<img src="${record.image}" alt="">` : ""}
    <p>${escapeHtml(record.kind)}</p>
    <h2>${escapeHtml(record.title)}</h2>
    ${record.note ? `<blockquote>${escapeHtml(record.note)}</blockquote>` : ""}
  `;
  viewer.showModal();
});

document.querySelector("[data-delete-memory]").addEventListener("click", () => {
  records = records.filter((record) => record.id !== activeId);
  saveRecords();
  viewer.close();
  render();
});

window.addEventListener("resize", resetView);
resetView();
render();
