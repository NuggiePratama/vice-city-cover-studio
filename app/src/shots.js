// Fixed scenes for screenshots: ?shot=cover draws one exported cover
// alone, filling the viewport; ?shot=editor opens the editor with a
// sample photo loaded. window.__shotReady is set once painted.
import { drawCover } from './render.js';
import { freshState, initEditor, loadImage } from './editor.js';

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

export async function runShot(shot, query) {
  const canvas = document.getElementById('stage');
  const photo = query.get('photo') || 'pier';
  const title = query.get('caption') || 'Sunset Heist';
  const layout = query.get('layout') || 'hero';
  const grade = query.get('grade') || 'sunset';
  try {
    await document.fonts.ready;
  } catch {
    // The canvas still draws with its fallback faces.
  }
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const img = await loadImage(`samples/${photo}.jpg`);
    const state = freshState();
    state.layout = layout;
    state.grade = grade;
    state.title = title;
    state.subtitle = query.get('subtitle') || 'Vice City nights';
    state.photos = [{ id: photo, label: photo, img }];
    // One photo fills every panel, each with its own crop, so the
    // cover shows how a single photo stretches across the poster.
    // Crops stay biased to the top of the photo, where faces sit.
    state.slots.forEach((s, i) => {
      s.photo = 0;
      s.zoom = 1.08 + (i % 3) * 0.08;
      s.ox = (i % 3 - 1) * 0.15;
      s.oy = i % 2 ? 0 : -0.08;
    });
    if (layout === 'collage') {
      // The collage's low strip is short and wide: push its photo down
      // (positive oy shows the photo's top) so the face stays in frame
      // instead of a headless torso.
      state.slots[2].oy = 0.42;
      state.slots[2].zoom = 1.1;
      state.slots[2].ox = 0;
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawCover(canvas, state);
    ready();
    return;
  }
  await initEditor({
    photo,
    title,
    layout,
    grade,
    subtitle: query.get('subtitle') || 'Vice City nights',
  });
  ready();
}
