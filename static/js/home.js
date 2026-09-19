import { animate, stagger } from "https://cdn.jsdelivr.net/npm/animejs@4.2.2/+esm";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reducedMotion) {
  animate(".dashboard-copy > *", {
    opacity: [0, 1],
    y: [18, 0],
    delay: stagger(90),
    duration: 700,
    ease: "outCubic",
  });

  animate(".home-avatar", {
    opacity: [0, 1],
    scale: [0.88, 1],
    rotate: [-4, 0],
    delay: 300,
    duration: 900,
    ease: "outBack",
  });

  animate("[data-home-card]", {
    opacity: [0, 1],
    y: [26, 0],
    delay: stagger(120, { start: 420 }),
    duration: 720,
    ease: "outCubic",
  });
}
