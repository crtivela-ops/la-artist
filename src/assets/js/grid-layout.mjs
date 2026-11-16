// Shared by the browser (home-grid.js) and the build (src/_data/homepage.js).
// One selection per day: the seed is today's date in Los Angeles, so every
// visitor sees the same grid that day and it changes at midnight PT.

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

// cols × rows of the tile grid. One row is two thirds of a column wide, so a
// 1×1 tile is a landscape postcard, 1×2 a portrait one, 2×2 a big landscape.
export const LAYOUTS = {
  wide: { cols: 6, rows: 7, big: 3, min: 22, max: 30 },
  mid: { cols: 4, rows: 7, big: 2, min: 15, max: 21 },
  narrow: { cols: 2, rows: 10, big: 2, min: 11, max: 14 },
};
export const EAGER_ROWS = { wide: 4, mid: 4, narrow: 3 };

function shuffled(list, rnd) {
  const a = list.slice();
  for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
  return a;
}

// cards: [[slug, id, artist, zip, tw, th, artistSlug, w], …] (tw/th = 400px thumbnail size, w = full width)
// Returns [{ i, col, row, cs, rs, big }] with 1-based grid lines. The grid is
// packed with no holes and a flat bottom edge.
export function dailyGrid(cards, dateStr, mode = "wide") {
  const L = LAYOUTS[mode] || LAYOUTS.wide;
  // Re-roll the tile pattern (still deterministic) until the card count is in range.
  let out = [];
  for (let attempt = 0; attempt < 50; attempt++) {
    out = packGrid(cards, dateStr, mode, L, attempt);
    if (out.length >= L.min && out.length <= L.max && out.some((t) => t.big)) break;
  }
  return out;
}

function packGrid(cards, dateStr, mode, L, attempt) {
  const rnd = mulberry32(hash("grid:" + mode + ":" + dateStr + ":" + attempt));
  // Card order for the day is shared by every layout, so phones see a subset
  // of the desktop selection.
  const order = shuffled(cards.map((_, k) => k), mulberry32(hash("cards:" + dateStr)));
  const portrait = order.filter((k) => cards[k][5] > cards[k][4]);
  const landscape = order.filter((k) => cards[k][5] <= cards[k][4]);
  const used = new Set();
  const take = (pool) => { for (const k of pool) if (!used.has(k)) { used.add(k); return k; } return null; };

  const filled = Array.from({ length: L.rows }, () => new Array(L.cols).fill(false));
  const free = (r, c) => r < L.rows && c < L.cols && !filled[r][c];
  const out = [];
  let bigs = 0;
  for (let r = 0; r < L.rows; r++) {
    for (let c = 0; c < L.cols; c++) {
      if (filled[r][c]) continue;
      const canBig = bigs < L.big && free(r, c + 1) && free(r + 1, c) && free(r + 1, c + 1);
      const canTall = free(r + 1, c);
      const x = rnd();
      let cs = 1, rs = 1, pool = landscape;
      if (canBig && x < 0.16) { cs = 2; rs = 2; bigs++; }
      else if (canTall && x < 0.46) { rs = 2; pool = portrait; }
      const i = take(pool) ?? take(order);
      for (let dr = 0; dr < rs; dr++) for (let dc = 0; dc < cs; dc++) filled[r + dr][c + dc] = true;
      out.push({ i, col: c + 1, row: r + 1, cs, rs, big: cs === 2 });
    }
  }
  return out;
}
