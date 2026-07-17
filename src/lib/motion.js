/**
 * Mutable, render-safe telemetry store.
 * Written by rAF/scroll listeners and read by WebGL scenes every frame.
 */
export const motion = {
  /** current scroll position in px */
  scrollY: 0,
  /** document scroll progress 0..1 */
  docProgress: 0,
  /** smoothed signed scroll velocity in px/s */
  velocity: 0,
  /** raw velocity target (from scroll events) */
  velocityTarget: 0,
  /** normalized pointer -1..1 */
  px: 0,
  py: 0,
  /** normalized pointer smoothed */
  spx: 0,
  spy: 0,
  /** pointer velocity magnitude px/s */
  pointerV: 0,
  /** viewport size */
  vw: 1280,
  vh: 800,
  /** reduced motion */
  reduced: false,
  /** coarse pointer */
  touch: false,
  dpr: 1,
  /** live Lenis instance (null until boot) */
  lenis: null,
};

let lastT = 0;
let lastX = 0;
let lastY = 0;

/** Global wiring — call once from App. */
export function bindTelemetry() {
  if (typeof window === "undefined") return () => {};

  motion.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  motion.touch = window.matchMedia("(pointer: coarse)").matches;
  motion.dpr = Math.min(window.devicePixelRatio || 1, 2);
  motion.vw = window.innerWidth;
  motion.vh = window.innerHeight;

  const onResize = () => {
    motion.vw = window.innerWidth;
    motion.vh = window.innerHeight;
  };

  const onPointer = (e) => {
    const nx = (e.clientX / motion.vw) * 2 - 1;
    const ny = (e.clientY / motion.vh) * 2 - 1;
    const now = performance.now();
    const dt = Math.max((now - lastT) / 1000, 1 / 240);
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const v = Math.hypot(dx, dy) / dt;
    motion.pointerV = motion.pointerV * 0.7 + v * 0.3;
    lastT = now;
    lastX = e.clientX;
    lastY = e.clientY;
    motion.px = nx;
    motion.py = ny;
  };

  let raf = 0;
  const loop = () => {
    // exponential smoothing so WebGL frames get silky values
    motion.spx += (motion.px - motion.spx) * 0.075;
    motion.spy += (motion.py - motion.spy) * 0.075;
    motion.velocity += (motion.velocityTarget - motion.velocity) * 0.12;
    motion.velocityTarget *= 0.92; // decay
    motion.pointerV *= 0.94;
    raf = requestAnimationFrame(loop);
  };

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });
  raf = requestAnimationFrame(loop);

  return () => {
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onPointer);
    cancelAnimationFrame(raf);
  };
}

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const lerp = (a, b, t) => a + (b - a) * t;
