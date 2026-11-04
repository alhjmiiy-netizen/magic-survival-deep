/** Render quality: 0 full, 1 crowded (fewer glows), 2 heavy crowd (minimal glows). Set each frame by the engine. */
export const Q = { lod: 0 };
/** Dev profiler: when window.__prof is set, flushes the canvas and accumulates ms per labelled section. */
let _pt = 0, _pk = '';
export function profMark(ctx: CanvasRenderingContext2D, k: string) {
  const prof = (window as unknown as { __prof?: Record<string, number> }).__prof; if (!prof) return;
  ctx.getImageData(0, 0, 1, 1); const t = performance.now(); if (_pk) prof[_pk] = (prof[_pk] || 0) + t - _pt; _pt = t; _pk = k;
}
/** Shared low-cost canvas art helpers: seeded RNG, cached glow sprites, offscreen canvases. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d')!;
  return [c, g];
}

const glowCache = new Map<string, HTMLCanvasElement>();
/** Soft radial glow sprite (64px) for a CSS colour; draw with 'lighter'. */
export function glowSprite(color: string): HTMLCanvasElement {
  let c = glowCache.get(color);
  if (c) return c;
  const [cv, g] = makeCanvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 1;
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  // fade inner stops
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.35, 'rgba(0,0,0,0.45)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(color, cv);
  c = cv;
  return c;
}

export function drawGlow(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, r: number, alpha = 1) {
  if (alpha <= 0 || r <= 0) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prev;
}

/** Make a solid-colour silhouette copy of a sprite (hit flash / frozen tint). */
export function tintSilhouette(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const [c, g] = makeCanvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Glowing stroke without shadowBlur: wide faint pass + mid pass + thin bright core. */
export function glowStroke(g: CanvasRenderingContext2D, color: string, core: string, width: number) {
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = 0.18;
  g.lineWidth = width * 5;
  g.stroke();
  g.globalAlpha = 0.45;
  g.lineWidth = width * 2.2;
  g.stroke();
  g.globalAlpha = 1;
  g.strokeStyle = core;
  g.lineWidth = width;
  g.stroke();
  g.restore();
}
