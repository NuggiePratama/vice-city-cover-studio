// Multi-panel poster layouts. A layout turns a canvas size into the
// rectangles its panels fill. Every rect is { x, y, w, h } in pixels,
// with an optional tilt in degrees for the snapshot collage. Cells are
// inset by half a gutter so the white frame lines read evenly.
function inset(rect, g) {
  return { x: rect.x + g, y: rect.y + g, w: rect.w - 2 * g, h: rect.h - 2 * g };
}

function thirds(w, h, g) {
  const hero = { x: 0, y: 0, w: w * 0.64, h };
  const side = { x: w * 0.64, y: 0, w: w * 0.36, h: h / 3 };
  return [
    inset(hero, g),
    inset(side, g),
    inset({ ...side, y: h / 3 }, g),
    inset({ ...side, y: (2 * h) / 3 }, g),
  ];
}

function grid(w, h, g, cols, rows) {
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push(
        inset(
          { x: (c * w) / cols, y: (r * h) / rows, w: w / cols, h: h / rows },
          g,
        ),
      );
    }
  }
  return cells;
}

export const LAYOUTS = [
  {
    id: 'hero',
    label: 'Hero + Three',
    cells(w, h) {
      return thirds(w, h, Math.max(3, Math.round(w * 0.006)));
    },
  },
  {
    id: 'full',
    label: 'Full Bleed',
    cells(w, h) {
      return [inset({ x: 0, y: 0, w, h }, 0)];
    },
  },
  {
    id: 'grid4',
    label: 'Four Square',
    cells(w, h) {
      return grid(w, h, Math.max(3, Math.round(w * 0.006)), 2, 2);
    },
  },
  {
    id: 'grid9',
    label: 'Nine Panel',
    cells(w, h) {
      return grid(w, h, Math.max(3, Math.round(w * 0.006)), 3, 3);
    },
  },
  {
    id: 'collage',
    label: 'Snapshot Collage',
    cells(w, h) {
      const g = Math.max(3, Math.round(w * 0.006));
      const big = { x: w * 0.06, y: h * 0.05, w: w * 0.58, h: h * 0.62, tilt: -4 };
      const top = { x: w * 0.6, y: h * 0.07, w: w * 0.36, h: h * 0.4, tilt: 3 };
      const low = { x: w * 0.1, y: h * 0.62, w: w * 0.78, h: h * 0.33, tilt: 2 };
      return [big, top, low].map((c) => ({ ...inset(c, g), tilt: c.tilt }));
    },
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}
