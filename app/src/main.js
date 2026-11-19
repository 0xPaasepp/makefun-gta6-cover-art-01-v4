// Velvet Heat — studio UI: state, history, panel editing, export.
// All rendering lives in cover.js; this file wires the DOM to it.

import { renderCover, exportCover, EXPORT_SIZES, photoSrc, loadPhoto } from './cover.js';
import { GRADES } from './grades.js';
import { TEMPLATES, SAMPLE_PHOTOS, templateById, defaultPanels } from './templates.js';
import { sceneByName, shotFromUrl } from './shots.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

export const state = {
  template: 'ink-heat',
  engine: 'ink',
  grade: 'golden-hour',
  title: 'VELVET HEAT',
  tagline: 'Vice City nights, your story in neon.',
  panels: defaultPanels(templateById('ink-heat')),
  selected: 0,
};

const uploads = {}; // photoId -> data URL for user-uploaded photos
let history = [];
let future = [];
let rendering = null;
let sliderArmed = false;

function snapshot() {
  return JSON.stringify({
    template: state.template, engine: state.engine, grade: state.grade,
    title: state.title, tagline: state.tagline, panels: state.panels,
  });
}

function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  syncControls();
  render();
}

export function pushHistory() {
  history.push(snapshot());
  if (history.length > 60) history.shift();
  future = [];
  updateHistoryButtons();
}

export function undo() {
  if (!history.length) return false;
  future.push(snapshot());
  restore(history.pop());
  updateHistoryButtons();
  return true;
}

export function redo() {
  if (!future.length) return false;
  history.push(snapshot());
  restore(future.pop());
  updateHistoryButtons();
  return true;
}

function updateHistoryButtons() {
  const u = $('#undoBtn'), r = $('#redoBtn');
  if (u) u.disabled = !history.length;
  if (r) r.disabled = !future.length;
}

/** Render the preview canvas (and the dual comparison when active). */
export async function render() {
  const canvas = $('#coverCanvas');
  if (!canvas) return;
  await document.fonts.ready;
  const job = renderCover(canvas, state, uploads);
  rendering = job;
  await job;
  const dual = $('#dualCanvas');
  if (dual && document.body.classList.contains('shot-dual')) {
    const inkState = { ...state, engine: 'ink', panels: state.panels.map((p) => ({ ...p, engine: 'ink' })) };
    const photoState = { ...state, engine: 'photo', panels: state.panels.map((p) => ({ ...p, engine: 'photo' })) };
    await renderCover($('#dualInk'), inkState, uploads);
    await renderCover($('#dualPhoto'), photoState, uploads);
    dual.hidden = false;
  }
  window.VelvetHeat.rendered = (window.VelvetHeat.rendered || 0) + 1;
}

/** Build the template picker buttons. */
function buildTemplates() {
  const wrap = $('#templatePicker');
  wrap.innerHTML = '';
  for (const t of TEMPLATES) {
    const b = document.createElement('button');
    b.className = 'tpl' + (t.id === state.template ? ' active' : '');
    b.textContent = t.name;
    b.title = t.desc;
    b.dataset.template = t.id;
    b.addEventListener('click', () => {
      if (t.id === state.template) return;
      pushHistory();
      state.template = t.id;
      state.panels = defaultPanels(t);
      state.selected = 0;
      syncControls();
      render();
    });
    wrap.appendChild(b);
  }
}

/** Build the grade picker buttons. */
function buildGrades() {
  const wrap = $('#gradePicker');
  wrap.innerHTML = '';
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.className = 'grade' + (g.id === state.grade ? ' active' : '');
    b.textContent = g.name;
    b.title = g.desc;
    b.dataset.grade = g.id;
    b.addEventListener('click', () => {
      pushHistory();
      state.grade = g.id;
      syncControls();
      render();
    });
    wrap.appendChild(b);
  }
}

/** Build the photo tray (9 generated + 2 kit photos + upload). */
function buildTray() {
  const wrap = $('#photoTray');
  wrap.innerHTML = '';
  for (const p of SAMPLE_PHOTOS) {
    const fig = document.createElement('figure');
    fig.className = 'thumb';
    fig.dataset.photo = p.id;
    fig.title = p.label;
    const img = document.createElement('img');
    img.src = p.file;
    img.alt = p.label;
    img.loading = 'lazy';
    fig.appendChild(img);
    const cap = document.createElement('figcaption');
    cap.textContent = p.label;
    fig.appendChild(cap);
    fig.addEventListener('click', () => {
      pushHistory();
      state.panels[state.selected].photo = p.id;
      syncControls();
      render();
    });
    wrap.appendChild(fig);
  }
  const up = document.createElement('label');
  up.className = 'thumb upload';
  up.innerHTML = '<span class="plus">+</span><figcaption>Upload your photo</figcaption>';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.hidden = true;
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = `upload-${Date.now()}`;
      uploads[id] = reader.result;
      pushHistory();
      state.panels[state.selected].photo = id;
      const fig = document.createElement('figure');
      fig.className = 'thumb';
      fig.dataset.photo = id;
      fig.innerHTML = `<img src="${reader.result}" alt="Your photo"><figcaption>Your photo</figcaption>`;
      fig.addEventListener('click', () => {
        pushHistory();
        state.panels[state.selected].photo = id;
        render();
      });
      wrap.insertBefore(fig, up);
      render();
    };
    reader.readAsDataURL(file);
  });
  up.appendChild(input);
  wrap.appendChild(up);
}

/** Build the per-panel strip (select + per-panel grade/engine overrides). */
function buildPanelStrip() {
  const wrap = $('#panelStrip');
  wrap.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const b = document.createElement('button');
    b.className = 'panel-chip' + (i === state.selected ? ' active' : '');
    b.textContent = `Panel ${i + 1} · ${panelLabel(panel.photo)}`;
    b.addEventListener('click', () => {
      state.selected = i;
      syncControls();
      render();
    });
    wrap.appendChild(b);
  });
}

function panelLabel(photoId) {
  const p = SAMPLE_PHOTOS.find((s) => s.id === photoId);
  return p ? p.label : 'Your photo';
}

function syncControls() {
  buildTemplates();
  buildGrades();
  buildPanelStrip();
  const panel = state.panels[state.selected] || state.panels[0];
  const titleEl = $('#titleInput');
  if (titleEl && titleEl.value !== state.title) titleEl.value = state.title;
  const tagEl = $('#taglineInput');
  if (tagEl && tagEl.value !== state.tagline) tagEl.value = state.tagline;
  const eng = $('#engineToggle');
  if (eng) eng.dataset.engine = state.engine;
  const gradeSel = $('#panelGrade');
  if (gradeSel) gradeSel.value = panel.grade || '';
  const engSel = $('#panelEngine');
  if (engSel) engSel.value = panel.engine || '';
  const zoom = $('#zoomRange');
  if (zoom) zoom.value = panel.zoom;
  const rot = $('#rotRange');
  if (rot) rot.value = panel.rot;
  const zoomVal = $('#zoomVal');
  if (zoomVal) zoomVal.textContent = `${Math.round(panel.zoom * 100)}%`;
  const rotVal = $('#rotVal');
  if (rotVal) rotVal.textContent = `${panel.rot}°`;
  updateHistoryButtons();
  document.querySelectorAll('[data-engine-btn]').forEach((b) => {
    b.classList.toggle('active', b.dataset.engineBtn === state.engine);
  });
}

/** Export all three sizes in one click; returns [{id,w,h,bytes}]. */
export async function exportAll() {
  const out = [];
  const status = $('#exportStatus');
  for (const size of EXPORT_SIZES) {
    if (status) status.textContent = `Exporting ${size.label}…`;
    const blob = await exportCover(state, uploads, size.w, size.h);
    out.push({ id: size.id, w: size.w, h: size.h, bytes: blob.size, blob });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `velvet-heat-${size.id}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  if (status) status.textContent = `Done — 3 PNGs exported (${out.map((o) => `${o.w}×${o.h}`).join(', ')}).`;
  window.VelvetHeat.lastExport = out.map(({ id, w, h, bytes }) => ({ id, w, h, bytes }));
  return out;
}

/** Apply a ?shot= scene before first render. */
function applyShot() {
  const name = shotFromUrl(location.search);
  if (!name) return;
  const scene = sceneByName(name);
  if (!scene) return;
  state.template = scene.template;
  state.engine = scene.engine;
  state.grade = scene.grade;
  state.title = scene.title;
  state.tagline = scene.tagline;
  state.panels = defaultPanels(templateById(scene.template));
  scene.photos.forEach((photo, i) => {
    if (state.panels[i]) state.panels[i].photo = photo;
  });
  document.body.dataset.shot = name;
  if (scene.bodyClass) document.body.classList.add(scene.bodyClass);
  if (scene.ui === 'dual') document.body.classList.add('shot-dual');
  if (scene.ui === 'export') document.body.classList.add('shot-export');
  if (scene.ui === 'cover') document.body.classList.add('shot-cover');
}

function wireEvents() {
  $('#titleInput').addEventListener('input', (e) => {
    state.title = e.target.value.slice(0, 60) || 'VELVET HEAT';
    render();
  });
  $('#taglineInput').addEventListener('input', (e) => {
    state.tagline = e.target.value.slice(0, 100);
    render();
  });
  $$('[data-engine-btn]').forEach((b) => {
    b.addEventListener('click', () => {
      pushHistory();
      state.engine = b.dataset.engineBtn;
      syncControls();
      render();
    });
  });
  $('#panelGrade').addEventListener('change', (e) => {
    pushHistory();
    state.panels[state.selected].grade = e.target.value || null;
    render();
  });
  $('#panelEngine').addEventListener('change', (e) => {
    pushHistory();
    state.panels[state.selected].engine = e.target.value || null;
    render();
  });
  $('#zoomRange').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = parseFloat(e.target.value);
    syncControls();
    render();
  });
  $('#rotRange').addEventListener('input', (e) => {
    state.panels[state.selected].rot = parseInt(e.target.value, 10);
    syncControls();
    render();
  });
  // History must capture the state BEFORE the slider moves: snapshot on
  // pointerdown/focus, not on change (which fires after the mutation).
  for (const id of ['#zoomRange', '#rotRange']) {
    $(id).addEventListener('pointerdown', () => {
      if (!sliderArmed) { sliderArmed = true; pushHistory(); }
    });
    $(id).addEventListener('focus', () => {
      if (!sliderArmed) { sliderArmed = true; pushHistory(); }
    });
    $(id).addEventListener('blur', () => { sliderArmed = false; });
    $(id).addEventListener('pointerup', () => { sliderArmed = false; });
  }
  $('#undoBtn').addEventListener('click', undo);
  $('#redoBtn').addEventListener('click', redo);
  $('#exportAllBtn').addEventListener('click', exportAll);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });

  // Canvas pointer editing: drag to reposition, wheel to zoom.
  const canvas = $('#coverCanvas');
  let drag = null;
  const panelAt = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    const rects = templateById(state.template).layout(canvas.width, canvas.height);
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return 0;
  };
  canvas.addEventListener('pointerdown', (ev) => {
    const i = panelAt(ev);
    state.selected = i;
    syncControls();
    pushHistory();
    drag = { x: ev.clientX, y: ev.clientY, px: state.panels[i].x, py: state.panels[i].y };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const panel = state.panels[state.selected];
    panel.x = Math.max(-1, Math.min(1, drag.px + ((ev.clientX - drag.x) / rect.width) * 2));
    panel.y = Math.max(-1, Math.min(1, drag.py + ((ev.clientY - drag.y) / rect.height) * 2));
    render();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const i = panelAt(ev);
    state.selected = i;
    const panel = state.panels[i];
    panel.zoom = Math.max(0.5, Math.min(3, panel.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
    syncControls();
    render();
  }, { passive: false });
}

// Test + screenshot hooks.
window.VelvetHeat = {
  state, uploads, render, undo, redo, exportAll,
  pushHistory, exportCover, renderCover, EXPORT_SIZES,
  setPanel(i, patch) { Object.assign(state.panels[i], patch); return render(); },
  setState(patch) { Object.assign(state, patch); syncControls(); return render(); },
  rendered: 0,
};

applyShot();
buildTray();
syncControls();
wireEvents();
updateHistoryButtons(); // pristine state is not itself an undo step
render();
