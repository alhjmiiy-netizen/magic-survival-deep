import React, { useRef, useEffect } from 'react';

interface ComboArtworkProps {
  comboId: string;
  className?: string;
}

export const ComboArtwork: React.FC<ComboArtworkProps> = ({ comboId, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Pitch black background
    ctx.fillStyle = '#020305';
    ctx.fillRect(0, 0, w, h);

    // Seeded random helper
    let seed = 42;
    for (let i = 0; i < comboId.length; i++) seed = (seed * 31 + comboId.charCodeAt(i)) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed >>> 0) / 4294967296;
    };

    // Stippled particle helper
    const drawNoise = (x: number, y: number, r: number, color: string, alpha: number, count: number) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      for (let i = 0; i < count; i++) {
        const rad = rand() * r;
        const ang = rand() * Math.PI * 2;
        ctx.fillRect(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, rand() * 1.6 + 0.8, rand() * 1.6 + 0.8);
      }
    };

    switch (comboId) {
      case 'thunderfall': {
        // Vertical cyan rain falling on dark crag
        for (let i = 0; i < 400; i++) {
          const x = rand() * w;
          const y = rand() * (h * 0.7);
          ctx.strokeStyle = rand() > 0.3 ? '#60a5fa' : '#ffffff';
          ctx.globalAlpha = rand() * 0.7 + 0.2;
          ctx.lineWidth = rand() * 1.5 + 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - rand() * 8, y + rand() * 25 + 15);
          ctx.stroke();
        }
        // Bright primary strike
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.45, 10);
        ctx.lineTo(w * 0.35, h * 0.75);
        ctx.stroke();
        // Ground crag
        for (let x = 0; x < w; x += 2) {
          const gy = h * 0.75 + (rand() - 0.5) * 8;
          drawNoise(x, gy, 8, '#94a3b8', 0.8, 12);
        }
        break;
      }

      case 'superconductor': {
        // Cyan glowing orb in stippled mist
        drawNoise(w * 0.55, h * 0.42, 65, '#0284c7', 0.3, 1400);
        drawNoise(w * 0.55, h * 0.42, 45, '#38bdf8', 0.6, 1200);
        drawNoise(w * 0.55, h * 0.42, 28, '#7dd3fc', 0.85, 900);
        drawNoise(w * 0.55, h * 0.42, 14, '#ffffff', 1.0, 600);
        // Electrical sparks
        ctx.strokeStyle = '#a5f3fc';
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(w * 0.55, h * 0.42);
          ctx.lineTo(w * 0.55 + (rand() - 0.5) * 80, h * 0.42 + (rand() - 0.5) * 80);
          ctx.stroke();
        }
        break;
      }

      case 'blizzard': {
        // White snow dots falling over snowy terrain
        for (let x = 0; x < w; x += 3) {
          const gy = h * 0.7 + (x / w) * 20 + (rand() - 0.5) * 6;
          drawNoise(x, gy, 12, '#ffffff', 0.9, 20);
        }
        for (let i = 0; i < 700; i++) {
          const x = rand() * w;
          const y = rand() * h;
          ctx.fillStyle = rand() > 0.4 ? '#ffffff' : '#bae6fd';
          ctx.globalAlpha = rand() * 0.8 + 0.2;
          ctx.fillRect(x, y, rand() * 2 + 1, rand() * 2 + 1);
        }
        break;
      }

      case 'laser_ray': {
        // Piercing vertical emerald green laser beam
        drawNoise(w * 0.5, h * 0.5, 40, '#065f46', 0.3, 1500);
        drawNoise(w * 0.5, h * 0.5, 20, '#10b981', 0.7, 1000);
        ctx.strokeStyle = '#6ee7b7';
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(w * 0.5, 5);
        ctx.lineTo(w * 0.5, h - 5);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        break;
      }

      case 'crimson_lightning': {
        // Jagged blood-red vertical electric arcs in deep red haze
        drawNoise(w * 0.5, h * 0.5, 70, '#7f1d1d', 0.4, 1600);
        drawNoise(w * 0.5, h * 0.5, 45, '#dc2626', 0.7, 1200);
        ctx.strokeStyle = '#f87171';
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 2.2;
        let cx = w * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, 10);
        for (let y = 15; y < h - 10; y += 14) {
          cx += (rand() - 0.5) * 26;
          ctx.lineTo(cx, y);
        }
        ctx.stroke();
        // Bright white core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0;
        ctx.stroke();
        break;
      }

      case 'nuclear_sun': {
        // Radiant white and glowing orange stippled sun sphere
        drawNoise(w * 0.5, h * 0.5, 68, '#9a3412', 0.4, 1800);
        drawNoise(w * 0.5, h * 0.5, 48, '#ea580c', 0.7, 1400);
        drawNoise(w * 0.5, h * 0.5, 32, '#fbbf24', 0.9, 1000);
        drawNoise(w * 0.5, h * 0.5, 18, '#ffffff', 1.0, 600);
        break;
      }

      case 'celestial_avatar': {
        // Blue archmage silhouette standing inside vertical aether light beam
        drawNoise(w * 0.5, h * 0.45, 60, '#1e3a8a', 0.4, 1600);
        drawNoise(w * 0.5, h * 0.45, 35, '#38bdf8', 0.75, 1200);
        drawNoise(w * 0.5, h * 0.45, 15, '#ffffff', 1.0, 700);
        // Robed archmage silhouette
        ctx.fillStyle = '#020617';
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.62, 4.5, 0, Math.PI * 2); // Head
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.64);
        ctx.lineTo(w * 0.42, h * 0.85);
        ctx.lineTo(w * 0.58, h * 0.85);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'storm_forest': {
        // Blue lightning branching horizontally over dark forest canopy
        for (let i = 0; i < 4; i++) {
          ctx.strokeStyle = '#93c5fd';
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          let x = 10;
          let y = h * 0.28 + i * 12;
          ctx.moveTo(x, y);
          while (x < w - 10) {
            x += rand() * 18 + 6;
            y += (rand() - 0.5) * 16;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        // Dark trees
        for (let x = 0; x < w; x += 4) {
          const th = h * 0.55 + rand() * 25;
          drawNoise(x, th, 14, '#1e293b', 0.85, 40);
        }
        break;
      }

      case 'molten_magma': {
        // Wavy red and gold lava ribbons flowing in black basalt
        drawNoise(w * 0.5, h * 0.5, 65, '#450a0a', 0.4, 1600);
        drawNoise(w * 0.55, h * 0.55, 45, '#dc2626', 0.75, 1400);
        drawNoise(w * 0.6, h * 0.5, 28, '#f59e0b', 0.9, 1000);
        drawNoise(w * 0.62, h * 0.48, 14, '#fef08a', 1.0, 600);
        break;
      }

      case 'aether_tsunami': {
        // Crashing white stippled wave in abyssal dark ocean
        drawNoise(w * 0.5, h * 0.65, 55, '#0369a1', 0.5, 1400);
        drawNoise(w * 0.45, h * 0.55, 38, '#38bdf8', 0.8, 1200);
        drawNoise(w * 0.4, h * 0.48, 22, '#ffffff', 1.0, 800);
        break;
      }

      case 'black_hole': {
        // Spiraling dark matter singularity
        drawNoise(w * 0.5, h * 0.5, 65, '#312e81', 0.4, 1500);
        drawNoise(w * 0.5, h * 0.5, 42, '#7c3aed', 0.7, 1200);
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, 16, 0, Math.PI * 2);
        ctx.fill();
        // Cyan horizon ring
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }

      case 'plasma_satellite':
      default: {
        // Double glowing rings of orbital ion spheres
        drawNoise(w * 0.5, h * 0.5, 50, '#1e1b4b', 0.4, 1200);
        ctx.strokeStyle = '#818cf8';
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.5, 45, 22, Math.PI / 4, 0, Math.PI * 2);
        ctx.stroke();
        drawNoise(w * 0.7, h * 0.35, 12, '#ffffff', 1.0, 300);
        drawNoise(w * 0.3, h * 0.65, 12, '#38bdf8', 1.0, 300);
        break;
      }
    }
  }, [comboId]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={220}
      className={`w-full h-full object-cover rounded-lg border border-stone-800 shadow-inner ${className}`}
    />
  );
};
