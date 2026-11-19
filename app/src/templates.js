// Velvet Heat — the six cover templates.
// Each template is a distinct multi-panel layout (rects in fractions of the
// cover) plus its own title treatment. Panel 0 is always the hero.

export const TEMPLATES = [
  {
    id: 'ink-heat',
    name: 'Ink Heat',
    desc: 'Classic GTA poster: big hero, three strips, starburst band',
    panels: 4,
    layout: (w, h) => [
      { x: 0, y: 0, w, h: h * 0.62 },
      { x: 0, y: h * 0.62, w: w * 0.34, h: h * 0.38 },
      { x: w * 0.34, y: h * 0.62, w: w * 0.33, h: h * 0.38 },
      { x: w * 0.67, y: h * 0.62, w: w * 0.33, h: h * 0.38 },
    ],
    title: { x: 0.5, y: 0.84, size: 0.115, align: 'center', color: '#fff7e8', stroke: '#1a0533', script: true },
    band: 'starburst',
  },
  {
    id: 'golden-hour-hero',
    name: 'Golden Hour Hero',
    desc: 'One full-bleed portrait, title floating over the sunset',
    panels: 1,
    layout: (w, h) => [{ x: 0, y: 0, w, h }],
    title: { x: 0.5, y: 0.8, size: 0.13, align: 'center', color: '#fff3d6', stroke: '#3a0a2e', script: false },
    band: 'sun',
  },
  {
    id: 'neon-tilt',
    name: 'Neon Tilt',
    desc: 'Diagonal split panels, tilted neon title',
    panels: 3,
    layout: (w, h) => [
      { x: 0, y: 0, w: w * 0.58, h: h * 0.66 },
      { x: w * 0.58, y: 0, w: w * 0.42, h: h * 0.66 },
      { x: 0, y: h * 0.66, w, h: h * 0.34 },
    ],
    title: { x: 0.5, y: 0.9, size: 0.11, align: 'center', color: '#7df9ff', stroke: '#12002e', script: false, tilt: -4 },
    band: 'neon',
  },
  {
    id: 'sunset-sleeve',
    name: 'Sunset Sleeve',
    desc: 'Vertical sleeve: hero left, two stacked portraits right',
    panels: 3,
    layout: (w, h) => [
      { x: 0, y: 0, w: w * 0.62, h },
      { x: w * 0.62, y: 0, w: w * 0.38, h: h * 0.5 },
      { x: w * 0.62, y: h * 0.5, w: w * 0.38, h: h * 0.5 },
    ],
    title: { x: 0.31, y: 0.86, size: 0.105, align: 'center', color: '#ffe9a8', stroke: '#2b0630', script: true },
    band: 'starburst',
  },
  {
    id: 'palm-grid',
    name: 'Palm Grid',
    desc: 'Six-panel grid, every moment on the wall at once',
    panels: 6,
    layout: (w, h) => {
      const out = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          out.push({ x: (w / 3) * c, y: (h / 2) * r, w: w / 3, h: h / 2 });
        }
      }
      return out;
    },
    title: { x: 0.5, y: 0.5, size: 0.12, align: 'center', color: '#ffffff', stroke: '#0d0220', script: false },
    band: 'none',
  },
  {
    id: 'vice-magazine',
    name: 'Vice Magazine',
    desc: 'Magazine cover: hero top, masthead, caption column',
    panels: 2,
    layout: (w, h) => [
      { x: 0, y: 0, w, h: h * 0.72 },
      { x: 0, y: h * 0.72, w, h: h * 0.28 },
    ],
    title: { x: 0.5, y: 0.1, size: 0.12, align: 'center', color: '#ffffff', stroke: '#160430', script: false },
    band: 'masthead',
  },
];

export function templateById(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

/** Default photos cycled across a template's panels. */
export const SAMPLE_PHOTOS = [
  { id: 'portrait', file: 'samples/portrait.jpg', label: 'Portrait' },
  { id: 'convertible', file: 'samples/convertible.jpg', label: 'Convertible' },
  { id: 'jetski', file: 'samples/jetski.jpg', label: 'Jetski' },
  { id: 'boombox', file: 'samples/boombox.jpg', label: 'Boombox' },
  { id: 'rooftop', file: 'samples/rooftop.jpg', label: 'Rooftop' },
  { id: 'skate', file: 'samples/skate.jpg', label: 'Skate' },
  { id: 'palmroad', file: 'samples/palmroad.jpg', label: 'Palm Road' },
  { id: 'neonstreet', file: 'samples/neonstreet.jpg', label: 'Neon Street' },
  { id: 'marina', file: 'samples/marina.jpg', label: 'Marina' },
  { id: 'boulevard', file: 'samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'pier', file: 'samples/pier.jpg', label: 'Pier' },
];

export function defaultPanels(template) {
  return Array.from({ length: template.panels }, (_, i) => ({
    photo: SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length].id,
    x: 0, y: 0, zoom: 1.0, rot: 0,
    grade: null, engine: null,
  }));
}
