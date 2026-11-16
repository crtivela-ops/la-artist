// Shared by the browser (pile.js) and the build (src/_data/homepage.js).
// One arrangement per day: the seed is today's date in Los Angeles, so every
// visitor on the same day sees the same pile, and it changes at midnight PT.

export function laDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function hash(str) { // FNV-1a, 32-bit
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Grid used to scatter the cards: one jittered cell per card, so the pile
// covers the table but cards still overlap their neighbours.
export const LAYOUTS = {
  wide: { n: 28, cols: 7, rows: 4 },
  mid: { n: 21, cols: 7, rows: 3 },
  narrow: { n: 15, cols: 3, rows: 5 },
};

// Returns [{ i, x, y, r, z }]: i = index into the card list, x/y = centre in %
// of the table, r = rotation in degrees, z = stacking order.
export function dailyPile(total, dateStr, mode = "wide") {
  const L = LAYOUTS[mode] || LAYOUTS.wide;
  // Same cards for every layout on a given day: narrower screens show the
  // first n of the day's draw.
  const pick = mulberry32(hash("cards:" + dateStr));
  const idx = Array.from({ length: total }, (_, k) => k);
  const want = Math.min(LAYOUTS.wide.n, total);
  for (let k = 0; k < want; k++) {
    const j = k + Math.floor(pick() * (total - k));
    [idx[k], idx[j]] = [idx[j], idx[k]];
  }
  const n = Math.min(L.n, total);
  const rnd = mulberry32(hash("layout:" + mode + ":" + dateStr));
  const cells = Array.from({ length: L.cols * L.rows }, (_, k) => k);
  for (let k = cells.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [cells[k], cells[j]] = [cells[j], cells[k]]; }
  const out = [];
  for (let k = 0; k < n; k++) {
    const c = cells[k % cells.length];
    const col = c % L.cols, row = Math.floor(c / L.cols);
    const cx = (col + 0.5) / L.cols, cy = (row + 0.5) / L.rows;
    const x = 8 + 84 * Math.min(1, Math.max(0, cx + (rnd() - 0.5) * 0.9 / L.cols));
    const y = 10 + 80 * Math.min(1, Math.max(0, cy + (rnd() - 0.5) * 0.9 / L.rows));
    const r = (rnd() - 0.5) * 26; // −13° … +13°
    out.push({ i: idx[k], x: +x.toFixed(2), y: +y.toFixed(2), r: +r.toFixed(1), z: 0 });
  }
  // Stacking order is its own shuffle so no single corner always ends on top.
  const order = out.map((_, k) => k);
  for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
  order.forEach((k, z) => { out[k].z = z + 1; });
  return out;
}
