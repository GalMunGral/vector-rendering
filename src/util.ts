export function parseColor(s: string): [number, number, number, number] {
  if (s.length == 7) {
    const r = parseInt(s.slice(1, 3), 16) / 255;
    const g = parseInt(s.slice(3, 5), 16) / 255;
    const b = parseInt(s.slice(5, 7), 16) / 255;
    return [r, g, b, 1];
  } else {
    const r = parseInt(s.slice(1, 2), 16) / 15;
    const g = parseInt(s.slice(2, 3), 16) / 15;
    const b = parseInt(s.slice(3, 4), 16) / 15;
    return [r, g, b, 1];
  }
}
