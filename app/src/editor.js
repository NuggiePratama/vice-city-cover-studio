// The editor: state, history, photo uploads, panel picking, drag to
// reposition a panel's photo, and PNG export. It owns the page's
// controls and re-renders the preview canvas after every change.
import { drawCover, SIZES } from './render.js';
import { GRADES } from './grades.js';
import { LAYOUTS, layoutById } from './layouts.js';

const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', label: 'Pier', src: 'samples/pier.jpg' },
];

export function freshState() {
  return {
    size: 'square',
    layout: 'hero',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'Vice City nights',
    titleScale: 1,
    titlePos: 0.88,
    tracking: 0.04,
    grain: true,
    vignette: true,
    photos: [],
    slots: Array.from({ length: 9 }, () => ({ photo: 0, zoom: 1, ox: 0, oy: 0 })),
    selected: 0,
  };
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function snapshot(state) {
  const { photos, ...rest } = state;
  return JSON.stringify({ ...rest, photoIds: photos.map((p) => p.id) });
}

function restore(state, json) {
  const data = JSON.parse(json);
  const photoIds = data.photoIds || [];
  delete data.photoIds;
  Object.assign(state, data);
  state.slots.forEach((slot) => {
    if (slot.photo >= photoIds.length) slot.photo = 0;
  });
}

export async function initEditor(preset = {}) {
  const state = freshState();
  if (preset.layout) state.layout = preset.layout;
  if (preset.grade) state.grade = preset.grade;
  if (preset.title) state.title = preset.title;
  if (preset.subtitle) state.subtitle = preset.subtitle;
  if (preset.size) state.size = preset.size;

  const canvas = document.getElementById('stage');
  const status = document.getElementById('status');
  const undoStack = [];
  const redoStack = [];
  let drag = null;
  let saveTimer = 0;

  for (const sample of SAMPLES) {
    try {
      const img = await loadImage(sample.src);
      state.photos.push({ id: sample.id, label: sample.label, img });
    } catch {
      // A missing sample still leaves the editor usable with uploads.
    }
  }
  if (preset.photo) {
    const idx = state.photos.findIndex((p) => p.id === preset.photo);
    if (idx >= 0) state.slots.forEach((s) => { s.photo = idx; });
  } else {
    state.slots.forEach((s, i) => { s.photo = state.photos.length ? i % state.photos.length : 0; });
  }
  try {
    const saved = localStorage.getItem('vice-city-cover-studio');
    if (saved && !preset.photo) restore(state, saved);
  } catch {
    // Private mode or a stale save: start from the defaults.
  }
  try {
    await document.fonts.ready;
  } catch {
    // Canvas falls back to sans-serif; the export still works.
  }

  function say(text) {
    if (status) status.textContent = text;
  }

  function remember() {
    undoStack.push(snapshot(state));
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem('vice-city-cover-studio', snapshot(state));
      } catch {
        // Storage full or unavailable: the cover still exports.
      }
    }, 300);
  }

  function render() {
    const size = SIZES[state.size];
    if (canvas.width !== size.w || canvas.height !== size.h) {
      canvas.width = size.w;
      canvas.height = size.h;
    }
    drawCover(canvas, state);
    document.querySelectorAll('[data-layout]').forEach((b) => {
      b.classList.toggle('active', b.dataset.layout === state.layout);
    });
    document.querySelectorAll('[data-grade]').forEach((b) => {
      b.classList.toggle('active', b.dataset.grade === state.grade);
    });
    document.querySelectorAll('[data-size]').forEach((b) => {
      b.classList.toggle('active', b.dataset.size === state.size);
    });
    document.querySelectorAll('[data-photo]').forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.photo) === state.slots[state.selected].photo);
    });
    const zoom = document.getElementById('zoom');
    if (zoom) zoom.value = String(state.slots[state.selected].zoom);
    const chips = document.getElementById('panelchips');
    if (chips) {
      const count = { hero: 4, full: 1, grid4: 4, grid9: 9, collage: 3 }[state.layout] || 1;
      chips.innerHTML = '';
      for (let i = 0; i < count; i += 1) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip' + (i === state.selected ? ' active' : '');
        chip.textContent = `Panel ${i + 1}`;
        chip.addEventListener('click', () => {
          state.selected = i;
          render();
        });
        chips.appendChild(chip);
      }
    }
  }

  function apply() {
    render();
  }

  function change(mutator) {
    remember();
    mutator();
    apply();
  }

  // ---- controls -------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  const layoutRow = $('layouts');
  LAYOUTS.forEach((layout) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = layout.id;
    b.textContent = layout.label;
    b.addEventListener('click', () => change(() => { state.layout = layout.id; state.selected = 0; }));
    layoutRow.appendChild(b);
  });

  const gradeRow = $('grades');
  GRADES.forEach((grade) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = grade.id;
    b.textContent = grade.label;
    b.style.setProperty('--swatch', grade.sky[1]);
    b.addEventListener('click', () => change(() => { state.grade = grade.id; }));
    gradeRow.appendChild(b);
  });

  const sizeRow = $('sizes');
  Object.entries(SIZES).forEach(([id, size]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = id;
    b.textContent = size.label;
    b.addEventListener('click', () => change(() => { state.size = id; }));
    sizeRow.appendChild(b);
  });

  function rebuildPhotoRow() {
    const row = $('photos');
    row.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.photo = String(i);
      b.textContent = photo.label;
      b.addEventListener('click', () => {
        change(() => { state.slots[state.selected].photo = i; });
        say(`Panel ${state.selected + 1} now shows ${photo.label}.`);
      });
      row.appendChild(b);
    });
  }

  $('upload').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        const id = `up-${state.photos.length}`;
        state.photos.push({ id, label: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo', img });
        state.slots[state.selected].photo = state.photos.length - 1;
      } catch {
        URL.revokeObjectURL(url);
      }
    }
    event.target.value = '';
    rebuildPhotoRow();
    remember();
    apply();
    say(`${files.length} photo(s) added. Drag the preview to position the selected panel.`);
  });

  // Remember the state BEFORE a control starts changing it, so undo
  // restores the pre-change state: remembering after the change would
  // only ever restore the change itself.
  function armRemember(el) {
    el.addEventListener('pointerdown', remember);
    el.addEventListener('focus', remember);
  }

  $('title').addEventListener('input', (e) => { state.title = e.target.value; apply(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; apply(); });
  armRemember($('title'));
  armRemember($('subtitle'));
  $('titlesize').addEventListener('input', (e) => { state.titleScale = Number(e.target.value); apply(); });
  $('titlepos').addEventListener('input', (e) => { state.titlePos = Number(e.target.value); apply(); });
  $('tracking').addEventListener('input', (e) => { state.tracking = Number(e.target.value); apply(); });
  armRemember($('titlesize'));
  armRemember($('titlepos'));
  armRemember($('tracking'));
  $('grain').addEventListener('change', (e) => change(() => { state.grain = e.target.checked; }));
  $('vignette').addEventListener('change', (e) => change(() => { state.vignette = e.target.checked; }));

  $('zoom').addEventListener('input', (e) => {
    state.slots[state.selected].zoom = Number(e.target.value);
    apply();
  });
  armRemember($('zoom'));

  $('undo').addEventListener('click', () => {
    const prev = undoStack.pop();
    if (!prev) return;
    redoStack.push(snapshot(state));
    restore(state, prev);
    apply();
  });
  $('redo').addEventListener('click', () => {
    const next = redoStack.pop();
    if (!next) return;
    undoStack.push(snapshot(state));
    restore(state, next);
    apply();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      $('undo').click();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      $('redo').click();
    }
  });

  // ---- panel picking + drag to reposition ------------------------------
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const cells = layoutById(state.layout).cells(canvas.width, canvas.height);
    const hit = cells.findIndex((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
    if (hit < 0) return;
    remember();
    state.selected = hit;
    drag = { x, y, moved: false };
    canvas.setPointerCapture(e.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const slot = state.slots[state.selected];
    slot.ox += (x - drag.x) / canvas.width;
    slot.oy += (y - drag.y) / canvas.height;
    if (Math.abs(x - drag.x) + Math.abs(y - drag.y) > 2) drag.moved = true;
    drag.x = x;
    drag.y = y;
    apply();
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
  });

  // ---- export ----------------------------------------------------------
  function renderAt(sizeId) {
    const size = SIZES[sizeId];
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    drawCover(off, state);
    return off;
  }

  function download(canvasEl, name) {
    canvasEl.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  }

  document.querySelectorAll('[data-export]').forEach((b) => {
    b.addEventListener('click', () => {
      const sizeId = b.dataset.export;
      const size = SIZES[sizeId];
      download(renderAt(sizeId), `cover-${size.w}x${size.h}.png`);
      say(`Saved cover-${size.w}x${size.h}.png`);
    });
  });
  $('exportall').addEventListener('click', () => {
    Object.keys(SIZES).forEach((sizeId, i) => {
      setTimeout(() => {
        const size = SIZES[sizeId];
        download(renderAt(sizeId), `cover-${size.w}x${size.h}.png`);
      }, i * 250);
    });
    say('Saved all three sizes: 1080x1080, 1080x1350, 1920x1080.');
  });

  // Keep the caption inputs in sync with the state (and with ?shot presets).
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('titlesize').value = String(state.titleScale);
  $('titlepos').value = String(state.titlePos);
  $('tracking').value = String(state.tracking);
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;

  rebuildPhotoRow();
  render();
  return { state, render, apply };
}
