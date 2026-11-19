// Velvet Heat — ?shot= scene presets for screenshots and testing.
// Each scene is a named, deterministic starting state. main.js applies the
// scene on load (before the first render) when location.search has ?shot=.

export const SHOT_SCENES = {
  cover: {
    label: 'Cover',
    template: 'ink-heat',
    engine: 'ink',
    grade: 'golden-hour',
    title: 'VELVET HEAT',
    tagline: 'Vice City nights, your story in neon.',
    photos: ['portrait', 'convertible', 'jetski', 'boombox'],
    ui: 'cover',
    bodyClass: 'shot-cover',
  },
  editor: {
    label: 'Editor',
    template: 'ink-heat',
    engine: 'photo',
    grade: 'vice-neon',
    title: 'VELVET HEAT',
    tagline: 'Vice City nights, your story in neon.',
    photos: ['portrait', 'convertible', 'jetski', 'boombox'],
    ui: 'editor',
    bodyClass: '',
  },
  export: {
    label: 'Export',
    template: 'sunset-sleeve',
    engine: 'photo',
    grade: 'sunset',
    title: 'SUMMER HEAT',
    tagline: 'Golden hour, every hour.',
    photos: ['convertible', 'palmroad', 'jetski'],
    ui: 'export',
    bodyClass: 'shot-export',
  },
  dual: {
    label: 'Dual Engine',
    template: 'ink-heat',
    engine: 'ink',
    grade: 'golden-hour',
    title: 'VELVET HEAT',
    tagline: 'Ink on the left, photo on the right.',
    photos: ['portrait', 'convertible', 'jetski', 'boombox'],
    ui: 'dual',
    bodyClass: 'shot-dual',
  },
};

export function sceneByName(name) {
  return SHOT_SCENES[name] || null;
}

export function shotFromUrl(search) {
  const params = new URLSearchParams(search || '');
  return params.get('shot');
}
