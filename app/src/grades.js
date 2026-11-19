// Colour grades for Vice City Cover Studio. Each grade is an original
// Vice City sunset / neon palette: two sky stops washed over a photo with
// an overlay blend, a deep shadow colour for the frame, and an accent
// used for the subtitle script and the title bar.
export const GRADES = [
  {
    id: 'sunset',
    label: 'Vice Sunset',
    sky: ['#ffb03d', '#ff3d7f'],
    deep: '#1d0b2e',
    wash: 0.3,
    accent: '#ffcf3f',
  },
  {
    id: 'neon',
    label: 'Neon Night',
    sky: ['#00e5ff', '#ff2fb3'],
    deep: '#0a0620',
    wash: 0.34,
    accent: '#00f0ff',
  },
  {
    id: 'teal',
    label: 'Teal Noir',
    sky: ['#0affc2', '#0a6cff'],
    deep: '#03131c',
    wash: 0.3,
    accent: '#7dffd4',
  },
  {
    id: 'gold',
    label: 'Golden Hour',
    sky: ['#ffc46b', '#ff7b00'],
    deep: '#241105',
    wash: 0.28,
    accent: '#ffe08a',
  },
  {
    id: 'magenta',
    label: 'Magenta Dusk',
    sky: ['#ff4fd8', '#7b2fff'],
    deep: '#160a2e',
    wash: 0.32,
    accent: '#ff8ae2',
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}
