// Entry point: a ?shot= query opens a fixed screenshot scene,
// otherwise the full editor starts with the sample photos loaded.
import { initEditor } from './editor.js';
import { runShot } from './shots.js';

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query);
} else {
  initEditor();
}
