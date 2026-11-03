/** Lightweight visual-only spell effects (pooled, no gameplay impact). */
import { drawGlow } from './ArtKit';

type Kind = 0 | 1 | 2 | 3 | 4; // ring, flash, bolt, star, fire
interface Fx { kind: Kind; x: number; y: number; size: number; life: number; max: number; color: string; pts: Float32Array; }

const MAX = 90;
const pool: Fx[] = [];
for (let i = 0; i < MAX; i++) pool.push({ kind: 0, x: 0, y: 0, size: 0, life: 0, max: 1, color: '#fff', pts: new Float32Array(24) });
let last = 0;

function spawn(kind: Kind, x: number, y: number, size: number, max: number, color: string): Fx | null {
  for (const f of pool) if (f.life <= 0) { f.kind = kind; f.x = x; f.y = y; f.size = size; f.life = max; f.max = max; f.color = color; return f; }
  return null;
}

export const FX = {
  ring(x: number, y: number, radius: number, color: string, dur = 0.45) { spawn(0, x, y, radius, dur, color); },
  flash(x: number, y: number, size: number, color: string) { spawn(1, x, y, size, 0.18, color); },
  bolt(x: number, y: number) {
    const f = spawn(2, x, y, 1, 0.28, 'rgba(120,180,255,1)');
    if (!f) return;
    let px = x + (Math.random() - 0.5) * 60;
    let py = y - 420;
    for (let i = 0; i < 12; i++) {
      f.pts[i * 2] = px; f.pts[i * 2 + 1] = py;
      py += 420 / 11; px += (Math.random() - 0.5) * 50; if (i === 10) px = x;
    }
    spawn(0, x, y, 70, 0.3, 'rgba(150,200,255,1)');
    spawn(1, x, y, 60, 0.25, 'rgba(180,210,255,1)');
  },
  star(x: number, y: number, radius: number) { spawn(3, x, y, radius, 0.5, 'rgba(180,230,255,1)'); spawn(0, x, y, radius, 0.5, 'rgba(150,220,255,1)'); },
  fire(x: number, y: number, radius: number) { spawn(4, x, y, radius, 0.6, 'rgba(255,120,30,1)'); spawn(0, x, y, radius, 0.55, 'rgba(255,90,20,1)'); },

  render(ctx: CanvasRenderingContext2D) {
    const now = performance.now();
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const f of pool) {
      if (f.life <= 0) continue;
      f.life -= dt;
      const k = Math.max(0, f.life / f.max); // 1 -> 0
      const p = 1 - k;
      if (f.kind === 0) {
        ctx.globalAlpha = k;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 10 * k + 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * (0.3 + p * 0.7), 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      } else if (f.kind === 1) {
        drawGlow(ctx, f.color, f.x, f.y, f.size * (0.6 + p), k);
      } else if (f.kind === 2) {
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const x = f.pts[i * 2] + (Math.random() - 0.5) * 6;
          const y = f.pts[i * 2 + 1];
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = k * 0.5;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 12;
        ctx.stroke();
        ctx.globalAlpha = k;
        ctx.strokeStyle = '#eef6ff';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (f.kind === 3) {
        ctx.globalAlpha = k * 0.45;
        ctx.fillStyle = '#bfe8ff';
        const R = f.size * (0.4 + p * 0.8);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const c = Math.cos(a), s = Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(f.x + c * R * 0.25 - s * 5, f.y + s * R * 0.25 + c * 5);
          ctx.lineTo(f.x + c * R, f.y + s * R);
          ctx.lineTo(f.x + c * R * 0.25 + s * 5, f.y + s * R * 0.25 - c * 5);
          ctx.fill();
        }
        drawGlow(ctx, f.color, f.x, f.y, R * 0.6, k * 0.25);
      } else {
        drawGlow(ctx, f.color, f.x, f.y, f.size * (0.5 + p * 0.9), k);
        drawGlow(ctx, 'rgba(255,230,150,1)', f.x, f.y, f.size * 0.4 * (1 - p * 0.5), k);
      }
    }
    ctx.restore();
  },
};
