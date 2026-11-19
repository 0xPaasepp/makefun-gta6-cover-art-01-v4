// Velvet Heat — the cover render engine.
// Dual engine: (a) face-aware INK — 78% posterize + halftone at 720px,
// 6 posterize levels, faces kept readable by softening the halftone inside
// a central face window; (b) PHOTO — five photographic grades.
// Draws the multi-panel poster, skyline, sun and title band on any canvas.

import { applyGrade, vignette } from './grades.js';
import { templateById } from './templates.js';

const INK_LEVELS = 6;
const INK_STRENGTH = 0.78; // 78% posterize
const INK_RENDER_PX = 720;

const imgCache = new Map();

export function loadPhoto(src) {
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load photo ${src}`));
    img.src = src;
  });
  imgCache.set(src, p);
  return p;
}

export function photoSrc(photoId, uploads) {
  if (uploads && uploads[photoId]) return uploads[photoId];
  return `samples/${photoId}.jpg`;
}

/** Seeded pseudo-random in [0,1) — stable skyline per seed. */
function rnd(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Refined Vice City skyline silhouette with lit windows and palms. */
export function drawSkyline(ctx, w, h, seed = 7) {
  const r = rnd(seed);
  const base = h * 0.985;
  ctx.save();
  ctx.fillStyle = '#160a2e';
  let x = -w * 0.02;
  while (x < w * 1.02) {
    const bw = w * (0.05 + r() * 0.07);
    const bh = h * (0.08 + r() * 0.22);
    ctx.fillRect(x, base - bh, bw, bh);
    // rooftop antenna
    if (r() < 0.3) ctx.fillRect(x + bw / 2 - 1, base - bh - h * 0.05, 2, h * 0.05);
    // lit windows
    ctx.fillStyle = r() < 0.6 ? 'rgba(255,214,120,0.85)' : 'rgba(125,249,255,0.8)';
    for (let wy = base - bh + h * 0.02; wy < base - h * 0.015; wy += h * 0.045) {
      for (let wx = x + bw * 0.18; wx < x + bw * 0.85; wx += bw * 0.3) {
        if (r() < 0.45) ctx.fillRect(wx, wy, Math.max(2, bw * 0.1), Math.max(2, h * 0.014));
      }
    }
    ctx.fillStyle = '#160a2e';
    x += bw + w * 0.008;
  }
  // palm silhouettes at the edges
  drawPalm(ctx, w * 0.06, base, h * 0.22, '#0d0520', -0.35);
  drawPalm(ctx, w * 0.94, base, h * 0.2, '#0d0520', 0.35);
  ctx.restore();
}

function drawPalm(ctx, x, y, s, color, lean) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 0.5, y - s * 0.6, x + lean * s, y - s);
  ctx.stroke();
  const tx = x + lean * s, ty = y - s;
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (0.1 + 0.13 * k) + (k % 2 ? 0.12 : -0.12);
    const ex = tx + Math.cos(a) * s * 0.55;
    const ey = ty + Math.abs(Math.sin(a)) * s * 0.32 - s * 0.08;
    ctx.lineWidth = Math.max(2, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * s * 0.28, ty + s * 0.22, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** Sunset sky gradient + glowing sun disc. */
export function drawSky(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2b0a4e');
  g.addColorStop(0.35, '#a4136b');
  g.addColorStop(0.62, '#ff5e62');
  g.addColorStop(0.85, '#ff9a3d');
  g.addColorStop(1, '#ffc46b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const sx = w * 0.5, sy = h * 0.34, sr = Math.min(w, h) * 0.16;
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 2.4);
  glow.addColorStop(0, 'rgba(255,236,170,0.9)');
  glow.addColorStop(0.4, 'rgba(255,150,90,0.35)');
  glow.addColorStop(1, 'rgba(255,150,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffedaa';
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
  // sun slats (retro stripe cuts)
  ctx.fillStyle = '#ff5e62';
  for (let i = 0; i < 3; i++) {
    const yy = sy + sr * (0.15 + i * 0.28);
    ctx.fillRect(sx - sr, yy, sr * 2, sr * 0.06);
  }
}

/** Posterize ImageData to 6 levels, blended 78% toward the posterized look. */
function posterize(data) {
  const d = data.data;
  const step = 255 / (INK_LEVELS - 1);
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = d[i + c];
      const q = Math.round(v / step) * step;
      d[i + c] = Math.round(v * (1 - INK_STRENGTH) + q * INK_STRENGTH);
    }
  }
  return data;
}

/**
 * Halftone pass: draws the posterized image, then a dot screen whose dots
 * shrink inside a central face window so faces stay readable in ink mode.
 */
function halftone(ctx, img, w, h) {
  ctx.drawImage(img, 0, 0, w, h);
  const scale = Math.max(1, Math.round(w / INK_RENDER_PX));
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(w / scale));
  off.height = Math.max(1, Math.round(h / scale));
  const octx = off.getContext('2d');
  octx.drawImage(img, 0, 0, off.width, off.height);
  const data = octx.getImageData(0, 0, off.width, off.height);
  posterize(data);
  octx.putImageData(data, 0, 0);
  // Rebuild from the posterized pixels as dots — fine 5px cell so the
  // print reads as ink, not as coarse blobs.
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fff7ee';
  ctx.fillRect(0, 0, w, h);
  const cell = 5 * scale;
  const cx = w / 2, cy = h * 0.42;
  const fx = w * 0.32, fy = h * 0.36; // face window radii (generous: faces live here)
  const px = octx.getImageData(0, 0, off.width, off.height).data;
  for (let gy = 0; gy < off.height; gy += Math.max(1, Math.round(cell / scale))) {
    for (let gx = 0; gx < off.width; gx += Math.max(1, Math.round(cell / scale))) {
      const i = (gy * off.width + gx) * 4;
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const dark = 1 - lum / 255;
      const dx = (gx / off.width) * w, dy = (gy / off.height) * h;
      const inFace = ((dx - cx) / fx) ** 2 + ((dy - cy) / fy) ** 2 < 1;
      // Faces: dots shrink to 30% so features survive; elsewhere full dots.
      const r = (cell * 0.5 * dark + 0.3) * (inFace ? 0.3 : 1);
      if (r < 0.5) continue;
      ctx.fillStyle = `rgb(${px[i] | 0},${px[i + 1] | 0},${px[i + 2] | 0})`;
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Keep a whisper of the posterized photo under the dots for readability.
  ctx.globalAlpha = 0.3;
  ctx.drawImage(off, 0, 0, w, h);
  ctx.globalAlpha = 1;
}

/** Draw one photo into a panel rect with pan/zoom/rotate + engine. */
async function drawPanel(ctx, rect, panel, state, uploads) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const src = photoSrc(panel.photo, uploads);
  let img;
  try {
    img = await loadPhoto(src);
  } catch {
    ctx.fillStyle = '#3a1040';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    return;
  }
  const engine = panel.engine || state.engine;
  const grade = panel.grade || state.grade;
  // Offscreen render at panel resolution (ink capped at 720px wide).
  const ow = engine === 'ink' ? Math.min(Math.round(w), INK_RENDER_PX) : Math.round(w);
  const oh = Math.max(1, Math.round((ow * h) / w));
  const off = document.createElement('canvas');
  off.width = ow; off.height = oh;
  const octx = off.getContext('2d');
  // Cover-fit with pan / zoom / rotation.
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const base = Math.max(ow / iw, oh / ih) * (panel.zoom || 1);
  octx.save();
  octx.translate(ow / 2 + (panel.x || 0) * ow * 0.4, oh / 2 + (panel.y || 0) * oh * 0.4);
  octx.rotate(((panel.rot || 0) * Math.PI) / 180);
  octx.drawImage(img, (-iw * base) / 2, (-ih * base) / 2, iw * base, ih * base);
  octx.restore();
  if (engine === 'ink') {
    halftone(octx, off, ow, oh);
  } else {
    const data = octx.getImageData(0, 0, ow, oh);
    applyGrade(data, grade);
    octx.putImageData(data, 0, 0);
    vignette(octx, ow, oh, 0.28);
  }
  ctx.drawImage(off, x, y, w, h);
  // Panel edge + inner shade.
  ctx.strokeStyle = 'rgba(255,247,232,0.9)';
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

/** Starburst rays behind the title band. */
function starburst(ctx, cx, cy, r0, r1, rays, c1, c2) {
  ctx.save();
  for (let i = 0; i < rays; i++) {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = ((i + 0.5) / rays) * Math.PI * 2;
    const a2 = ((i + 1) / rays) * Math.PI * 2;
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1);
    ctx.lineTo(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0);
    ctx.lineTo(cx + Math.cos(a2) * r1, cy + Math.sin(a2) * r1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function fitFont(ctx, text, maxW, startPx, family, weight = 900) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 10 && ctx.measureText(text).width > maxW) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

/** Title band: starburst + HEAT stars + SUMMER 2026 + tagline. */
function drawTitle(ctx, w, h, state, template) {
  const t = template.title;
  const cx = w * t.x, cy = h * t.y;
  const size = h * t.size;
  ctx.save();
  if (template.band === 'starburst') {
    starburst(ctx, cx, cy, h * 0.08, h * 0.3, 24, 'rgba(255,94,98,0.85)', 'rgba(255,154,61,0.85)');
  } else if (template.band === 'sun') {
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, h * 0.3);
    g.addColorStop(0, 'rgba(255,236,170,0.75)');
    g.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (template.band === 'neon') {
    ctx.shadowColor = '#ff2e96';
    ctx.shadowBlur = h * 0.03;
  } else if (template.band === 'masthead') {
    ctx.fillStyle = 'rgba(22,4,48,0.55)';
    ctx.fillRect(0, 0, w, h * 0.2);
  }
  ctx.textAlign = t.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(cx, cy);
  if (t.tilt) ctx.rotate((t.tilt * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  // Stars row above the title — clear of the title's stroke.
  ctx.font = `${Math.round(size * 0.32)}px Anton, sans-serif`;
  ctx.fillStyle = '#ffd76a';
  ctx.textAlign = 'center';
  ctx.fillText('★  HEAT  ★', cx, cy - size * 1.08);
  // Main title with stroke for pop.
  const px = fitFont(ctx, state.title, w * 0.92, size, 'Anton, sans-serif');
  ctx.font = `900 ${px}px Anton, sans-serif`;
  ctx.lineWidth = Math.max(3, px * 0.09);
  ctx.strokeStyle = t.stroke;
  ctx.lineJoin = 'round';
  ctx.strokeText(state.title, cx, cy - size * 0.3);
  ctx.fillStyle = t.color;
  ctx.fillText(state.title, cx, cy - size * 0.3);
  // Tagline in Pacifico script.
  if (state.tagline) {
    const tp = fitFont(ctx, state.tagline, w * 0.86, size * 0.4, 'Pacifico, cursive', 400);
    ctx.font = `${tp}px Pacifico, cursive`;
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(state.tagline, cx, cy + size * 0.42);
  }
  // SUMMER 2026 footer — spaced below the tagline so they never touch.
  ctx.font = `${Math.round(size * 0.28)}px Anton, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillText('—  S U M M E R   2 0 2 6  —', cx, cy + size * 1.02);
  ctx.restore();
  ctx.restore();
}

/** Render the full cover onto `canvas` (async: photos load first). */
export async function renderCover(canvas, state, uploads) {
  const template = templateById(state.template);
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  drawSky(ctx, w, h);
  const rects = template.layout(w, h);
  for (let i = 0; i < rects.length; i++) {
    const panel = state.panels[i] || state.panels[0];
    await drawPanel(ctx, rects[i], panel, state, uploads);
  }
  // Skyline sits along the bottom edge, over the panels' lower strip.
  if (template.id !== 'palm-grid') drawSkyline(ctx, w, h, 7);
  drawTitle(ctx, w, h, state, template);
  return canvas;
}

/** Render a cover at export size and return a PNG blob. */
export async function exportCover(state, uploads, ew, eh) {
  const c = document.createElement('canvas');
  c.width = ew; c.height = eh;
  await renderCover(c, state, uploads);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

export const EXPORT_SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
];
