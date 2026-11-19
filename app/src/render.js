// Draws a finished cover onto a canvas at the canvas's own size.
// State shape (see editor.js): { layout, grade, title, subtitle,
// titleScale, titlePos, tracking, grain, vignette, photos, slots,
// selected }. photos are { id, img }; slots are per-panel
// { photo, zoom, ox, oy } where photo is an index into photos.
import { gradeById } from './grades.js';
import { layoutById } from './layouts.js';

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Paints one photo into a rect, cover-fit, with a zoom and a pan
// (ox, oy are fractions of the rect). The pan is clamped so the photo
// never leaves a gap at the rect's edge.
function paintPhoto(ctx, img, rect, zoom, ox, oy) {
  const fit = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = fit * Math.max(1, zoom);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const maxOx = Math.max(0, (pw - rect.w) / 2 / rect.w);
  const maxOy = Math.max(0, (ph - rect.h) / 2 / rect.h);
  const cx = rect.x + rect.w / 2 + clamp(ox, -maxOx, maxOx) * rect.w;
  const cy = rect.y + rect.h / 2 + clamp(oy, -maxOy, maxOy) * rect.h;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
}

// Washes a grade over a panel: a sky gradient in overlay blend, then
// a deep shade rising from the foot so lettering stays readable.
function washGrade(ctx, rect, grade) {
  const sky = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(1, grade.sky[1]);
  ctx.save();
  ctx.globalAlpha = grade.wash;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.45, 0, rect.y + rect.h);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(10,4,24,0.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

// Deterministic grain: the same seed every render, so an export never
// changes between runs. A tiny linear congruential generator is enough.
function speckle(ctx, w, h, seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const count = Math.floor((w * h) / 1400);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < count; i += 1) {
    const x = next() * w;
    const y = next() * h;
    const r = 0.6 + next() * 1.4;
    ctx.fillRect(x, y, r, r);
  }
  ctx.restore();
}

function fitFont(ctx, text, start, maxWidth, family, weight, tracking) {
  let size = start;
  const set = (s) => {
    ctx.font = `${weight} ${s}px ${family}`;
    try {
      ctx.letterSpacing = `${Math.round(s * tracking)}px`;
    } catch {
      // letterSpacing is new in some browsers; the fit still holds.
    }
  };
  set(size);
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    set(size);
  }
  return size;
}

function drawTitleBlock(ctx, w, h, state, grade) {
  const title = state.title.trim().toUpperCase();
  const sub = state.subtitle.trim();
  if (!title && !sub) return;
  const base = Math.round(h * 0.115 * state.titleScale);
  const cy = h * state.titlePos;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title) {
    const size = fitFont(ctx, title, base, w * 0.92, 'Anton, sans-serif', '400', state.tracking);
    ctx.font = `400 ${size}px Anton, sans-serif`;
    const tw = ctx.measureText(title).width;
    const barH = Math.max(6, size * 0.1);
    ctx.fillStyle = grade.accent;
    ctx.fillRect((w - tw) / 2 - size * 0.08, cy - size * 0.62, tw + size * 0.16, barH);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.22;
    ctx.shadowOffsetY = size * 0.05;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, cy);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // ignore
    }
    if (sub) {
      const subSize = Math.max(18, Math.round(size * 0.34));
      ctx.font = `${subSize}px Pacifico, cursive`;
      ctx.fillStyle = grade.accent;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = subSize * 0.25;
      ctx.fillText(sub, w / 2, cy + size * 0.72);
    }
  } else if (sub) {
    const subSize = Math.max(22, Math.round(base * 0.5));
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub, w / 2, cy);
  }
  ctx.restore();
}

export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = gradeById(state.grade);
  const layout = layoutById(state.layout);
  ctx.save();
  ctx.fillStyle = grade.deep;
  ctx.fillRect(0, 0, w, h);
  const cells = layout.cells(w, h);
  const frame = Math.max(4, Math.round(w * 0.007));
  cells.forEach((cell, i) => {
    const slot = state.slots[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const photo = state.photos[slot.photo];
    ctx.save();
    if (cell.tilt) {
      ctx.translate(cell.x + cell.w / 2, cell.y + cell.h / 2);
      ctx.rotate((cell.tilt * Math.PI) / 180);
      ctx.translate(-cell.w / 2, -cell.h / 2);
      ctx.fillStyle = '#fdfdf8';
      ctx.fillRect(-frame, -frame, cell.w + 2 * frame, cell.h + 2 * frame);
      ctx.beginPath();
      ctx.rect(0, 0, cell.w, cell.h);
      ctx.clip();
      if (photo && photo.img) paintPhoto(ctx, photo.img, { x: 0, y: 0, w: cell.w, h: cell.h }, slot.zoom, slot.ox, slot.oy);
      washGrade(ctx, { x: 0, y: 0, w: cell.w, h: cell.h }, grade);
    } else {
      ctx.beginPath();
      ctx.rect(cell.x, cell.y, cell.w, cell.h);
      ctx.clip();
      if (photo && photo.img) paintPhoto(ctx, photo.img, cell, slot.zoom, slot.ox, slot.oy);
      washGrade(ctx, cell, grade);
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = frame;
      ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
    }
    ctx.restore();
  });
  if (state.grain) speckle(ctx, w, h, 20261119);
  if (state.vignette) {
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
  drawTitleBlock(ctx, w, h, state, grade);
  ctx.restore();
}
