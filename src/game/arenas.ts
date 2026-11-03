import { ArenaRealm } from '../types/game';
import { mulberry32, makeCanvas, drawGlow, glowStroke } from './ArtKit';

export const ARENAS_LIST: ArenaRealm[] = [
  {
    id: 'astral_sanctuary',
    name: 'Astral Sanctuary',
    subtitle: 'The Floating Cosmic Dais',
    description: 'An ancient stone dais suspended in the starlit void. Sacred blue arcane runes amplify celestial magic.',
    ambientColor: '#0a101f',
    ringColor: 'rgba(56, 189, 248, 0.65)',
    sigilColor: '#38bdf8',
    primaryWeather: 'snow',
    hazardDescription: 'Void rift edges pull unstable dimensional anomalies.',
    unlocked: true,
  },
  {
    id: 'infernal_abyss',
    name: 'Infernal Abyss',
    subtitle: 'The Molten Brimstone Caldera',
    description: 'A shattered volcanic crag suspended above seas of churning magma. The air boils with brimstone and embers.',
    ambientColor: '#1a0808',
    ringColor: 'rgba(239, 68, 68, 0.75)',
    sigilColor: '#f97316',
    primaryWeather: 'embers',
    hazardDescription: 'Scorching magma fissures erupt with periodic shockwaves.',
    unlocked: true,
  },
  {
    id: 'glacial_citadel',
    name: 'Glacial Citadel',
    subtitle: 'Ruins of Niflheim',
    description: 'Crystalline ancient frost columns buried beneath a permafrost glacier. Howling winds chill living souls.',
    ambientColor: '#06131f',
    ringColor: 'rgba(186, 230, 253, 0.7)',
    sigilColor: '#7dd3fc',
    primaryWeather: 'snow',
    hazardDescription: 'Slick ice reduces deceleration but increases frost spell potency by 35%.',
    unlocked: true,
  },
  {
    id: 'void_crypt',
    name: 'Void Crypt',
    subtitle: 'The Nether Catacombs',
    description: 'Corrupted eldritch mausoleum where physical reality dissolves into the gaping cosmic maw of the abyss.',
    ambientColor: '#12071f',
    ringColor: 'rgba(168, 85, 247, 0.75)',
    sigilColor: '#c084fc',
    primaryWeather: 'blood_rain',
    hazardDescription: 'Abyssal blood rain accelerates demonic movement velocity by 15%.',
    unlocked: true,
  },
  {
    id: 'celestial_throne',
    name: 'Celestial Throne',
    subtitle: 'The Golden Eclipse',
    description: 'A gilded throne-dais under a dying eclipse. Radiant runes burn gold and the final Colossus waits.',
    ambientColor: '#140f04',
    ringColor: 'rgba(250, 204, 21, 0.7)',
    sigilColor: '#facc15',
    primaryWeather: 'stardust',
    hazardDescription: 'Solar flares scorch the dais.',
    unlocked: true,
  },
];

interface ArenaTheme {
  seed: number;
  voidTop: string;
  voidBottom: string;
  nebula: string[]; // rgba prefixes "r,g,b"
  stone: [number, number, number];
  crack: string;
  rune: string; // "r,g,b"
  runeCore: string;
  ember: string; // "r,g,b"
  crystal: string; // "r,g,b"
}

const THEMES: Record<string, ArenaTheme> = {
  astral_sanctuary: {
    seed: 1337,
    voidTop: '#060918',
    voidBottom: '#020309',
    nebula: ['60,110,255', '130,60,230', '30,160,255', '90,40,180'],
    stone: [44, 50, 66],
    crack: 'rgba(4,6,12,0.85)',
    rune: '80,200,255',
    runeCore: '#e6f8ff',
    ember: '255,96,32',
    crystal: '90,200,255',
  },
  infernal_abyss: {
    seed: 4242,
    voidTop: '#140505',
    voidBottom: '#050101',
    nebula: ['200,50,20', '255,110,30', '120,20,40', '170,40,90'],
    stone: [54, 38, 36],
    crack: 'rgba(10,3,2,0.9)',
    rune: '255,130,40',
    runeCore: '#fff1d6',
    ember: '255,70,20',
    crystal: '255,140,60',
  },
  glacial_citadel: {
    seed: 777,
    voidTop: '#06131f',
    voidBottom: '#01060b',
    nebula: ['80,180,255', '150,220,255', '60,120,200', '120,160,255'],
    stone: [58, 74, 92],
    crack: 'rgba(6,14,24,0.85)',
    rune: '160,230,255',
    runeCore: '#ffffff',
    ember: '120,200,255',
    crystal: '180,235,255',
  },
  void_crypt: {
    seed: 9001,
    voidTop: '#0e0618',
    voidBottom: '#030106',
    nebula: ['150,60,255', '200,50,180', '80,40,200', '255,60,120'],
    stone: [42, 36, 58],
    crack: 'rgba(6,2,10,0.9)',
    rune: '190,120,255',
    runeCore: '#f5e8ff',
    ember: '255,50,110',
    crystal: '200,140,255',
  },
  celestial_throne: {
    seed: 2026,
    voidTop: '#120c03',
    voidBottom: '#040201',
    nebula: ['255,190,60', '255,140,40', '200,120,255', '255,220,120'],
    stone: [62, 54, 40],
    crack: 'rgba(12,8,2,0.9)',
    rune: '255,210,90',
    runeCore: '#fffbe6',
    ember: '255,180,60',
    crystal: '255,220,120',
  },
};

interface ArenaCache {
  floor: HTMLCanvasElement;
  floorScale: number;
  floorExtent: number;
  runeOuter: HTMLCanvasElement;
  runeInner: HTMLCanvasElement;
  runeScale: number;
  runeR: number;
  crystal: HTMLCanvasElement;
  obeliskBase: HTMLCanvasElement;
  ruins: HTMLCanvasElement[];
  ruinSlots: { a: number; d: number; v: number; s: number; ph: number; depth: number }[];
  embers: Float32Array; // x,y,phase,speed
  sky: HTMLCanvasElement | null;
  skyW: number;
  skyH: number;
}

const caches = new Map<string, ArenaCache>();
const BOLT_PTS = 9;
const bolts = { t: new Float32Array(6), life: new Float32Array(6), pts: new Float32Array(6 * BOLT_PTS * 2) };
let boltRng = mulberry32(99);

function themeFor(arena: ArenaRealm): ArenaTheme {
  return THEMES[arena.id] || THEMES.astral_sanctuary;
}

function stonePoly(
  g: CanvasRenderingContext2D,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
  rnd: () => number,
  gap: number
) {
  const ri = r0 + gap;
  const ro = r1 - gap;
  const ga = gap / ((r0 + r1) / 2);
  const s0 = a0 + ga;
  const s1 = a1 - ga;
  const j = () => (rnd() - 0.5) * gap * 2.2;
  g.beginPath();
  const steps = 3;
  for (let k = 0; k <= steps; k++) {
    const a = s0 + ((s1 - s0) * k) / steps;
    g.lineTo(Math.cos(a) * (ri + j()), Math.sin(a) * (ri + j()));
  }
  // chamfered corner
  for (let k = steps; k >= 0; k--) {
    const a = s0 + ((s1 - s0) * k) / steps;
    g.lineTo(Math.cos(a) * (ro + j()), Math.sin(a) * (ro + j()));
  }
  g.closePath();
}

function buildFloor(t: ArenaTheme, R: number) {
  const rnd = mulberry32(t.seed);
  const M = 360; // margin for rim glow / cliff
  const S = 0.55;
  const ext = R + M;
  const [c, g] = makeCanvas(ext * 2 * S, ext * 2 * S);
  g.scale(S, S);
  g.translate(ext, ext);

  // far-rim ember glow (behind the platform)
  g.globalCompositeOperation = 'lighter';
  const emberSpots = [-0.75, -0.35, 2.5, 3.6, 1.2];
  for (const a of emberSpots) {
    const rr = R + 40;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    const gr = g.createRadialGradient(x, y, 0, x, y, 340);
    gr.addColorStop(0, `rgba(${t.ember},0.30)`);
    gr.addColorStop(0.5, `rgba(${t.ember},0.10)`);
    gr.addColorStop(1, `rgba(${t.ember},0)`);
    g.fillStyle = gr;
    g.fillRect(x - 340, y - 340, 680, 680);
  }
  // blue rim haze
  const haze = g.createRadialGradient(0, 0, R * 0.9, 0, 0, R + 260);
  haze.addColorStop(0, `rgba(${t.rune},0)`);
  haze.addColorStop(0.3, `rgba(${t.rune},0.10)`);
  haze.addColorStop(1, `rgba(${t.rune},0)`);
  g.fillStyle = haze;
  g.beginPath();
  g.arc(0, 0, R + 260, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'source-over';

  // cliff / underside thickness (irregular broken rock edge)
  g.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const rr = R + 6 + rnd() * 18;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr + 70 + rnd() * 30);
  }
  g.closePath();
  const cliff = g.createLinearGradient(0, -R, 0, R + 100);
  cliff.addColorStop(0, '#0b0d14');
  cliff.addColorStop(1, '#151925');
  g.fillStyle = cliff;
  g.fill();
  // dangling rock teeth under the bottom rim
  g.fillStyle = '#0c0f17';
  for (let i = 0; i < 40; i++) {
    const a = 0.15 + rnd() * (Math.PI - 0.3);
    const x = Math.cos(a) * R;
    const y = Math.sin(a) * R + 80;
    const w = 20 + rnd() * 50;
    g.beginPath();
    g.moveTo(x - w / 2, y - 20);
    g.lineTo(x + w / 2, y - 20);
    g.lineTo(x + (rnd() - 0.5) * 20, y + 40 + rnd() * 90);
    g.closePath();
    g.fill();
  }

  // platform base (mortar colour)
  const [sr, sg, sb] = t.stone;
  g.beginPath();
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const rr = R + (rnd() - 0.5) * 14;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fillStyle = `rgb(${sr * 0.35},${sg * 0.35},${sb * 0.35})`;
  g.fill();
  g.save();
  g.clip();

  // stone plates: concentric courses of irregular blocks
  let r = 0;
  const courses: number[] = [0, 70];
  r = 70;
  while (r < R + 20) {
    r += 62 + rnd() * 34;
    courses.push(r);
  }
  for (let ci = 1; ci < courses.length; ci++) {
    const r0 = courses[ci - 1];
    const r1 = courses[ci];
    const mid = (r0 + r1) / 2;
    const n = Math.max(6, Math.round((Math.PI * 2 * mid) / (70 + rnd() * 40)));
    const off = rnd() * Math.PI * 2;
    // irregular angular splits
    const cuts: number[] = [];
    for (let k = 0; k < n; k++) cuts.push(off + ((k + (rnd() - 0.5) * 0.5) / n) * Math.PI * 2);
    for (let k = 0; k < n; k++) {
      const a0 = cuts[k];
      const a1 = k + 1 < n ? cuts[k + 1] : cuts[0] + Math.PI * 2;
      if (r1 > R - 40 && rnd() < 0.12) continue; // missing / broken stones at rim
      stonePoly(g, r0, r1, a0, a1, rnd, 3.2);
      const v = 0.75 + rnd() * 0.45;
      const tone = (x: number) => Math.min(255, Math.round(x * v));
      const am = (a0 + a1) / 2;
      const cx = Math.cos(am) * mid;
      const cy = Math.sin(am) * mid;
      const sgrad = g.createLinearGradient(cx - 40, cy - 40, cx + 40, cy + 40);
      sgrad.addColorStop(0, `rgb(${tone(sr * 1.25)},${tone(sg * 1.25)},${tone(sb * 1.3)})`);
      sgrad.addColorStop(1, `rgb(${tone(sr * 0.8)},${tone(sg * 0.8)},${tone(sb * 0.85)})`);
      g.fillStyle = sgrad;
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.05)';
      g.lineWidth = 1.5;
      g.stroke();

      // surface speckle
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let q = 0; q < 6; q++) {
        const aa = a0 + rnd() * (a1 - a0);
        const rr2 = r0 + rnd() * (r1 - r0);
        g.fillRect(Math.cos(aa) * rr2, Math.sin(aa) * rr2, 2 + rnd() * 3, 2 + rnd() * 2);
      }

      // cracks
      if (rnd() < 0.45) {
        let px = cx + (rnd() - 0.5) * 20;
        let py = cy + (rnd() - 0.5) * 20;
        let dir = rnd() * Math.PI * 2;
        g.beginPath();
        g.moveTo(px, py);
        const segs = 3 + Math.floor(rnd() * 4);
        for (let q = 0; q < segs; q++) {
          dir += (rnd() - 0.5) * 1.4;
          const len = 8 + rnd() * 16;
          px += Math.cos(dir) * len;
          py += Math.sin(dir) * len;
          g.lineTo(px, py);
          if (rnd() < 0.3) {
            g.moveTo(px, py);
          }
        }
        g.strokeStyle = t.crack;
        g.lineWidth = 1.6;
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.06)';
        g.lineWidth = 0.8;
        g.translate(1, 1);
        g.stroke();
        g.translate(-1, -1);
      }
    }
  }

  // engraved faint rune lines on the floor
  g.globalCompositeOperation = 'lighter';
  for (const rr of [420, 560]) {
    g.beginPath();
    g.arc(0, 0, rr, 0, Math.PI * 2);
    g.strokeStyle = `rgba(${t.rune},0.10)`;
    g.lineWidth = 3;
    g.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * 340, Math.sin(a) * 340);
    g.lineTo(Math.cos(a) * 560, Math.sin(a) * 560);
    g.strokeStyle = `rgba(${t.rune},0.08)`;
    g.lineWidth = 2;
    g.stroke();
  }
  // rune light bounce on stones near centre
  const bounce = g.createRadialGradient(0, 0, 0, 0, 0, 520);
  bounce.addColorStop(0, `rgba(${t.rune},0.22)`);
  bounce.addColorStop(0.6, `rgba(${t.rune},0.06)`);
  bounce.addColorStop(1, `rgba(${t.rune},0)`);
  g.fillStyle = bounce;
  g.fillRect(-520, -520, 1040, 1040);
  g.globalCompositeOperation = 'source-over';

  // edge darkening vignette over platform
  const vig = g.createRadialGradient(0, 0, R * 0.45, 0, 0, R);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(2,3,8,0.65)');
  g.fillStyle = vig;
  g.fillRect(-R, -R, R * 2, R * 2);
  g.restore();

  // glowing rim line
  g.globalCompositeOperation = 'lighter';
  g.beginPath();
  g.arc(0, 0, R - 2, 0, Math.PI * 2);
  glowStroke(g, `rgba(${t.rune},0.35)`, `rgba(${t.rune},0.35)`, 1.5);
  g.globalCompositeOperation = 'source-over';
  return { c, S, ext };
}

function glyph(g: CanvasRenderingContext2D, rnd: () => number, size: number) {
  g.beginPath();
  const kind = Math.floor(rnd() * 5);
  const s = size;
  if (kind === 0) {
    g.moveTo(0, -s); g.lineTo(0, s); g.moveTo(-s * 0.6, -s * 0.3); g.lineTo(s * 0.6, s * 0.3);
  } else if (kind === 1) {
    g.moveTo(-s * 0.6, s); g.lineTo(0, -s); g.lineTo(s * 0.6, s); g.moveTo(-s * 0.3, 0); g.lineTo(s * 0.3, 0);
  } else if (kind === 2) {
    g.arc(0, 0, s * 0.6, 0, Math.PI * 2); g.moveTo(0, -s); g.lineTo(0, s);
  } else if (kind === 3) {
    g.moveTo(-s * 0.6, -s); g.lineTo(s * 0.6, -s); g.lineTo(-s * 0.6, s); g.lineTo(s * 0.6, s);
  } else {
    g.moveTo(0, -s); g.lineTo(s * 0.6, 0); g.lineTo(0, s); g.lineTo(-s * 0.6, 0); g.closePath();
  }
}

function buildRunes(t: ArenaTheme) {
  const RR = 330;
  const S = 0.8;
  const size = (RR + 30) * 2 * S;
  const col = `rgba(${t.rune},1)`;
  const rnd = mulberry32(t.seed + 7);

  // outer: rings + glyph band + 12-point star
  const [o, og] = makeCanvas(size, size);
  og.scale(S, S);
  og.translate(RR + 30, RR + 30);
  og.lineCap = 'round';
  for (const [rr, w] of [[RR, 3], [RR - 34, 2], [RR - 46, 1.2], [205, 2.2]] as [number, number][]) {
    og.beginPath();
    og.arc(0, 0, rr, 0, Math.PI * 2);
    glowStroke(og, col, t.runeCore, w);
  }
  og.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = ((i * 5) % 12) / 12 * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * (RR - 46);
    const y = Math.sin(a) * (RR - 46);
    if (i === 0) og.moveTo(x, y); else og.lineTo(x, y);
  }
  glowStroke(og, col, t.runeCore, 1.6);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    og.save();
    og.rotate(a);
    og.translate(0, -(RR - 17));
    glyph(og, rnd, 8);
    glowStroke(og, col, t.runeCore, 1.4);
    og.restore();
  }
  // 12 orb nodes
  og.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    drawGlow(og, col, Math.cos(a) * (RR - 46), Math.sin(a) * (RR - 46), 22, 0.9);
  }

  // inner: hexagram + small rings
  const [n, ng] = makeCanvas(size, size);
  ng.scale(S, S);
  ng.translate(RR + 30, RR + 30);
  ng.lineCap = 'round';
  for (let tri = 0; tri < 2; tri++) {
    ng.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = (i / 3) * Math.PI * 2 + tri * Math.PI / 3 - Math.PI / 2;
      ng.lineTo(Math.cos(a) * 190, Math.sin(a) * 190);
    }
    glowStroke(ng, col, t.runeCore, 2);
  }
  for (const rr of [110, 96, 40]) {
    ng.beginPath();
    ng.arc(0, 0, rr, 0, Math.PI * 2);
    glowStroke(ng, col, t.runeCore, 1.6);
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ng.save();
    ng.rotate(a);
    ng.translate(0, -103);
    glyph(ng, rnd, 4.5);
    glowStroke(ng, col, t.runeCore, 1);
    ng.restore();
  }
  ng.globalCompositeOperation = 'lighter';
  const core = ng.createRadialGradient(0, 0, 0, 0, 0, 200);
  core.addColorStop(0, `rgba(${t.rune},0.45)`);
  core.addColorStop(1, `rgba(${t.rune},0)`);
  ng.fillStyle = core;
  ng.fillRect(-200, -200, 400, 400);
  return { o, n, S, RR: RR + 30 };
}

function buildCrystal(t: ArenaTheme) {
  const [c, g] = makeCanvas(60, 140);
  g.translate(30, 70);
  const grad = g.createLinearGradient(-18, 0, 18, 0);
  grad.addColorStop(0, `rgba(${t.crystal},0.9)`);
  grad.addColorStop(0.5, t.runeCore);
  grad.addColorStop(1, `rgba(${t.crystal},0.6)`);
  g.beginPath();
  g.moveTo(0, -64); g.lineTo(16, -18); g.lineTo(10, 50); g.lineTo(0, 64); g.lineTo(-10, 50); g.lineTo(-16, -18);
  g.closePath();
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 1.2;
  g.stroke();
  g.beginPath();
  g.moveTo(0, -64); g.lineTo(0, 64);
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.stroke();
  return c;
}

function buildObeliskBase(t: ArenaTheme) {
  const [c, g] = makeCanvas(120, 90);
  g.translate(60, 50);
  g.fillStyle = '#0a0c13';
  g.beginPath();
  g.ellipse(0, 22, 52, 18, 0, 0, Math.PI * 2);
  g.fill();
  const [sr, sg, sb] = t.stone;
  g.fillStyle = `rgb(${sr * 1.1},${sg * 1.1},${sb * 1.15})`;
  g.beginPath();
  g.moveTo(-40, 10); g.lineTo(-28, -18); g.lineTo(28, -18); g.lineTo(40, 10); g.lineTo(28, 26); g.lineTo(-28, 26);
  g.closePath();
  g.fill();
  g.fillStyle = `rgb(${sr * 0.6},${sg * 0.6},${sb * 0.7})`;
  g.fillRect(-40, 10, 80, 16);
  g.strokeStyle = `rgba(${t.rune},0.8)`;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-24, -6); g.lineTo(24, -6);
  g.stroke();
  return c;
}

function buildRuin(t: ArenaTheme, rnd: () => number, kind: number) {
  const W = 180;
  const H = 240;
  const [c, g] = makeCanvas(W, H);
  g.translate(W / 2, H / 2);
  const [sr, sg, sb] = t.stone;
  const lit = `rgb(${Math.round(sr * 1.2)},${Math.round(sg * 1.2)},${Math.round(sb * 1.3)})`;
  const dark = `rgb(${Math.round(sr * 0.45)},${Math.round(sg * 0.45)},${Math.round(sb * 0.5)})`;
  if (kind % 2 === 0) {
    // broken pillar segment
    const w = 34 + rnd() * 16;
    const h = 90 + rnd() * 60;
    const grad = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, dark);
    grad.addColorStop(0.35, lit);
    grad.addColorStop(1, dark);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(-w / 2, -h / 2 + 10);
    for (let i = 0; i <= 5; i++) g.lineTo(-w / 2 + (w * i) / 5, -h / 2 + rnd() * 18);
    g.lineTo(w / 2, h / 2);
    g.lineTo(-w / 2, h / 2);
    g.closePath();
    g.fill();
    // flutes
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      g.beginPath();
      g.moveTo(-w / 2 + (w * i) / 4, -h / 2 + 18);
      g.lineTo(-w / 2 + (w * i) / 4, h / 2 - 4);
      g.stroke();
    }
    // base block + rock underneath
    g.fillStyle = lit;
    g.fillRect(-w / 2 - 8, h / 2 - 4, w + 16, 12);
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(-w / 2 - 10, h / 2 + 8); g.lineTo(w / 2 + 10, h / 2 + 8); g.lineTo(rnd() * 10, h / 2 + 40 + rnd() * 20);
    g.closePath();
    g.fill();
    g.strokeStyle = `rgba(${t.rune},0.9)`;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -h / 4); g.lineTo(0, h / 4);
    g.stroke();
  } else {
    // floating rock chunk with a flat top
    const w = 70 + rnd() * 60;
    const top = -20;
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(-w / 2, top);
    g.lineTo(w / 2, top);
    g.lineTo(w * 0.3, top + 30 + rnd() * 20);
    g.lineTo(rnd() * 10 - 5, top + 70 + rnd() * 40);
    g.lineTo(-w * 0.32, top + 34 + rnd() * 20);
    g.closePath();
    g.fill();
    g.fillStyle = lit;
    g.beginPath();
    g.ellipse(0, top, w / 2, 12, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.4)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-w * 0.2, top - 4); g.lineTo(w * 0.1, top + 6);
    g.stroke();
    if (kind === 3) {
      // small broken arch / wall stub on top
      g.fillStyle = lit;
      g.fillRect(-w * 0.3, top - 50, 14, 48);
      g.fillRect(w * 0.12, top - 36, 14, 34);
      g.fillStyle = dark;
      g.fillRect(-w * 0.3 + 10, top - 50, 4, 48);
    }
  }
  return c;
}

function buildSky(t: ArenaTheme, w: number, h: number) {
  const pad = 120;
  const [c, g] = makeCanvas(w + pad * 2, h + pad * 2);
  const W = c.width;
  const H = c.height;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, t.voidTop);
  bg.addColorStop(1, t.voidBottom);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const rnd = mulberry32(t.seed + 3);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = (0.25 + rnd() * 0.45) * Math.max(W, H);
    const col = t.nebula[i % t.nebula.length];
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${0.10 + rnd() * 0.08})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // wispy nebula strands
  for (let i = 0; i < 6; i++) {
    const col = t.nebula[i % t.nebula.length];
    g.beginPath();
    let x = rnd() * W;
    let y = rnd() * H;
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (rnd() - 0.5) * W * 0.5;
      y += (rnd() - 0.5) * H * 0.3;
      g.quadraticCurveTo(x + (rnd() - 0.5) * 200, y + (rnd() - 0.5) * 200, x, y);
    }
    g.strokeStyle = `rgba(${col},0.05)`;
    g.lineWidth = 40 + rnd() * 60;
    g.stroke();
  }
  for (let i = 0; i < (W * H) / 2600; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const b = rnd();
    g.fillStyle = `rgba(220,235,255,${0.25 + b * 0.6})`;
    const s = b > 0.97 ? 2 : 1;
    g.fillRect(x, y, s, s);
    if (b > 0.985) drawGlow(g, 'rgba(170,210,255,1)', x, y, 6, 0.6);
  }
  return c;
}

function getCache(arena: ArenaRealm, R: number): ArenaCache {
  let c = caches.get(arena.id);
  if (c) return c;
  const t = themeFor(arena);
  const floor = buildFloor(t, R);
  const runes = buildRunes(t);
  const rnd = mulberry32(t.seed + 11);
  const ruins = [0, 1, 2, 3, 4, 5].map((k) => buildRuin(t, rnd, k));
  const ruinSlots = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rnd() * 0.18;
    ruinSlots.push({ a, d: R + 90 + rnd() * 330, v: Math.floor(rnd() * ruins.length), s: 0.55 + rnd() * 0.75, ph: rnd() * 6.28, depth: 0.08 + rnd() * 0.2 });
  }
  const embers = new Float32Array(60 * 4);
  for (let i = 0; i < 60; i++) {
    const a = rnd() * Math.PI * 2;
    const d = R - 60 + rnd() * 220;
    embers[i * 4] = Math.cos(a) * d;
    embers[i * 4 + 1] = Math.sin(a) * d;
    embers[i * 4 + 2] = rnd();
    embers[i * 4 + 3] = 0.3 + rnd() * 0.7;
  }
  c = {
    floor: floor.c,
    floorScale: floor.S,
    floorExtent: floor.ext,
    runeOuter: runes.o,
    runeInner: runes.n,
    runeScale: runes.S,
    runeR: runes.RR,
    crystal: buildCrystal(t),
    obeliskBase: buildObeliskBase(t),
    ruins,
    ruinSlots,
    embers,
    sky: null,
    skyW: 0,
    skyH: 0,
  };
  caches.set(arena.id, c);
  return c;
}

export const OBELISK_POSITIONS: [number, number][] = [
  [0, -440],
  [440, 0],
  [0, 440],
  [-440, 0],
];

export class ArenaRenderer {
  /** Pre-build caches (call once on arena select to avoid a first-frame hitch). */
  public static warm(arena: ArenaRealm, radius: number) {
    getCache(arena, radius);
  }

  public static renderArenaBase(
    ctx: CanvasRenderingContext2D,
    arena: ArenaRealm,
    radius: number,
    cameraX = 0,
    cameraY = 0
  ) {
    const t = themeFor(arena);
    const c = getCache(arena, radius);
    const now = performance.now() * 0.001;
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    // 0. Screen-space cosmic void with slight parallax
    if (!c.sky || c.skyW !== cw || c.skyH !== ch) {
      c.sky = buildSky(t, cw, ch);
      c.skyW = cw;
      c.skyH = ch;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const px = Math.max(-110, Math.min(110, -cameraX * 0.06)) - 120;
    const py = Math.max(-110, Math.min(110, -cameraY * 0.06)) - 120;
    ctx.drawImage(c.sky, px, py);
    ctx.restore();

    // 1. far floating ruins (behind platform: upper half)
    this.drawRuins(ctx, c, radius, cameraX, cameraY, now, true);

    // 2. Static stone platform
    const e = c.floorExtent;
    ctx.drawImage(c.floor, -e, -e, e * 2, e * 2);

    // 3. Animated rune circle (2 pre-rendered layers, rotated + pulsed)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + Math.sin(now * 1.8) * 0.12;
    const rr = c.runeR;
    ctx.globalAlpha = pulse;
    ctx.save();
    ctx.rotate(now * 0.05);
    ctx.drawImage(c.runeOuter, -rr, -rr, rr * 2, rr * 2);
    ctx.restore();
    ctx.save();
    ctx.rotate(-now * 0.12);
    ctx.drawImage(c.runeInner, -rr, -rr, rr * 2, rr * 2);
    ctx.restore();
    ctx.globalAlpha = 1;
    drawGlow(ctx, `rgba(${t.rune},1)`, 0, 0, 360, 0.1 + pulse * 0.08);

    // 4. Crystal obelisks
    for (let i = 0; i < OBELISK_POSITIONS.length; i++) {
      const [ox, oy] = OBELISK_POSITIONS[i];
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(c.obeliskBase, ox - 60, oy - 50);
      ctx.globalCompositeOperation = 'lighter';
      const bob = Math.sin(now * 2 + i) * 6;
      drawGlow(ctx, `rgba(${t.crystal},1)`, ox, oy - 60 + bob, 90, 0.55 + Math.sin(now * 3 + i) * 0.15);
      ctx.drawImage(c.crystal, ox - 22, oy - 120 + bob, 44, 103);
      drawGlow(ctx, `rgba(${t.rune},1)`, ox, oy + 10, 60, 0.5);
    }

    // 5. Ember motes rising near the rim
    ctx.fillStyle = `rgba(${t.ember},0.9)`;
    const em = c.embers;
    for (let i = 0; i < em.length; i += 4) {
      const ph = (em[i + 2] + now * 0.08 * em[i + 3]) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
      ctx.fillRect(em[i] + Math.sin(now + i) * 10, em[i + 1] - ph * 160, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;

    // 6. Blue lightning wisps around the rim
    this.drawBolts(ctx, t, radius, now);
    ctx.restore();

    // 7. near floating ruins (lower half, still behind actors)
    this.drawRuins(ctx, c, radius, cameraX, cameraY, now, false);
  }

  private static drawRuins(
    ctx: CanvasRenderingContext2D,
    c: ArenaCache,
    R: number,
    camX: number,
    camY: number,
    now: number,
    back: boolean
  ) {
    for (const s of c.ruinSlots) {
      const sinA = Math.sin(s.a);
      if (back !== sinA < 0.15) continue;
      const img = c.ruins[s.v];
      const x = Math.cos(s.a) * s.d + camX * s.depth;
      const y = sinA * s.d + camY * s.depth + Math.sin(now * 0.8 + s.ph) * 10;
      const w = img.width * s.s;
      const h = img.height * s.s;
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    }
  }

  private static drawBolts(ctx: CanvasRenderingContext2D, t: ArenaTheme, R: number, now: number) {
    const dtSlot = 0.016;
    for (let b = 0; b < 6; b++) {
      bolts.life[b] -= dtSlot;
      if (bolts.life[b] <= -0.4 - boltRng() * 1.5) {
        bolts.life[b] = 0.12 + boltRng() * 0.2;
        bolts.t[b] = bolts.life[b];
        let a = boltRng() * Math.PI * 2;
        let d = R + 10 + boltRng() * 120;
        const base = b * BOLT_PTS * 2;
        for (let k = 0; k < BOLT_PTS; k++) {
          bolts.pts[base + k * 2] = Math.cos(a) * d;
          bolts.pts[base + k * 2 + 1] = Math.sin(a) * d;
          a += (boltRng() - 0.5) * 0.06;
          d += 14 + boltRng() * 22;
        }
      }
      if (bolts.life[b] <= 0) continue;
      const base = b * BOLT_PTS * 2;
      ctx.beginPath();
      for (let k = 0; k < BOLT_PTS; k++) {
        const x = bolts.pts[base + k * 2] + (k > 0 ? (boltRng() - 0.5) * 16 : 0);
        const y = bolts.pts[base + k * 2 + 1] + (k > 0 ? (boltRng() - 0.5) * 16 : 0);
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const al = bolts.life[b] / bolts.t[b];
      ctx.globalAlpha = al;
      ctx.strokeStyle = `rgba(${t.rune},0.35)`;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = t.runeCore;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
