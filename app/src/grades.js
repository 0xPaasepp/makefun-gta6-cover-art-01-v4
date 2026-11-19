// Velvet Heat — photographic grades (photo engine).
// Five named grades, applied per-pixel to ImageData so every render is
// deterministic and fully offline. Each grade is a pure function of the
// source pixel plus a light overlay pass done by the caller.

export const GRADES = [
  { id: 'golden-hour', name: 'Golden Hour', desc: 'Warm low sun, honey highlights' },
  { id: 'vice-neon', name: 'Vice Neon', desc: 'Magenta highs, cyan shadows' },
  { id: 'sunset', name: 'Sunset', desc: 'Deep orange dusk, punchy contrast' },
  { id: 'noir', name: 'Noir', desc: 'High-contrast black & white' },
  { id: 'palm-fade', name: 'Palm Fade', desc: 'Lifted blacks, teal-green wash' },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

// Contrast around 128 with strength s (1 = neutral).
function contrast(v, s) {
  return clamp((v - 128) * s + 128);
}

/** Mutate ImageData in place to apply the named grade. */
export function applyGrade(data, gradeId) {
  const d = data.data;
  switch (gradeId) {
    case 'golden-hour': {
      for (let i = 0; i < d.length; i += 4) {
        d[i] = contrast(d[i] * 1.14, 1.08);
        d[i + 1] = contrast(d[i + 1] * 1.04, 1.08);
        d[i + 2] = contrast(d[i + 2] * 0.82, 1.08);
      }
      break;
    }
    case 'vice-neon': {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const t = lum / 255; // 0 shadow -> 1 highlight
        // Shadows go cyan, highlights go magenta; saturation lifted.
        // Keep the mid-tones anchored so skin and skies do not go muddy.
        d[i] = clamp(contrast(r * 1.14, 1.14) * (0.8 + 0.4 * t) + 26 * t);
        d[i + 1] = clamp(contrast(g * 1.06, 1.14) * (1.04 - 0.3 * t));
        d[i + 2] = clamp(contrast(b * 1.2, 1.14) * (1.22 - 0.42 * t));
      }
      break;
    }
    case 'sunset': {
      for (let i = 0; i < d.length; i += 4) {
        d[i] = contrast(d[i] * 1.18, 1.16);
        d[i + 1] = contrast(d[i + 1] * 0.92, 1.16);
        d[i + 2] = contrast(d[i + 2] * 0.78, 1.16);
      }
      break;
    }
    case 'noir': {
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // Stronger contrast with a lifted floor so shadows keep detail.
        const v = clamp(contrast(lum, 1.32) * 0.96 + 6);
        d[i] = v; d[i + 1] = v; d[i + 2] = v;
      }
      break;
    }
    case 'palm-fade': {
      for (let i = 0; i < d.length; i += 4) {
        // Lifted blacks (fade) + teal-green wash, saturation pulled back.
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const mix = 0.82;
        d[i] = clamp((r * mix + lum * (1 - mix)) * 0.94 + 26);
        d[i + 1] = clamp((g * mix + lum * (1 - mix)) * 1.02 + 30);
        d[i + 2] = clamp((b * mix + lum * (1 - mix)) * 1.02 + 22);
      }
      break;
    }
    default:
      break;
  }
  return data;
}

/** Soft radial vignette painted over a panel after grading. */
export function vignette(ctx, w, h, strength = 0.32) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(10,4,20,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
