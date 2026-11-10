import fs from "node:fs";
const art = JSON.parse(fs.readFileSync(new URL("./artworks.json", import.meta.url)));

const REGIONS = [
  { slug: "outside-la", name: "Outside LA / California", blurb: "ArtCards mailed from elsewhere in California, outside Los Angeles County." },
  { slug: "us-states", name: "U.S. States", blurb: "ArtCards that travelled to L.A. from other U.S. states." },
  { slug: "international", name: "International", blurb: "ArtCards mailed in from outside the United States." },
  { slug: "unknown", name: "Unknown", blurb: "ArtCards that arrived without a readable ZIP code or location." },
];
const sortByDate = (a, b) => a.date.localeCompare(b.date) || a.id - b.id;

function group(keyFn) {
  const m = new Map();
  for (const a of art) for (const k of keyFn(a)) { if (!m.has(k)) m.set(k, []); m.get(k).push(a); }
  for (const v of m.values()) v.sort(sortByDate);
  return m;
}
const zipMap = group((a) => a.zips);
const zips = [...zipMap].map(([zip, items]) => {
  const n = new Map();
  for (const a of items) for (const h of a.neighborhoods) n.set(h.slug, h);
  return { zip, items, inLA: items.some((a) => a.laZips.includes(zip)), neighborhoods: [...n.values()] };
}).sort((a, b) => a.zip.localeCompare(b.zip));

const nMap = new Map();
for (const a of art) for (const h of a.neighborhoods) { if (!nMap.has(h.slug)) nMap.set(h.slug, { ...h, items: [] }); nMap.get(h.slug).items.push(a); }
const neighborhoods = [...nMap.values()].map((n) => ({ ...n, items: n.items.sort(sortByDate), zips: [...new Set(n.items.flatMap((a) => a.zips))].sort() }))
  .sort((a, b) => a.name.localeCompare(b.name));

const aMap = new Map();
for (const a of art) { if (!aMap.has(a.artistSlug)) aMap.set(a.artistSlug, { name: a.artist, slug: a.artistSlug, items: [] }); aMap.get(a.artistSlug).items.push(a); }
const artists = [...aMap.values()].map((x) => ({ ...x, items: x.items.sort(sortByDate), zips: [...new Set(x.items.flatMap((a) => a.zips))].sort() }))
  .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
const letterOf = (s) => { const c = s.normalize("NFD").replace(/[^A-Za-z0-9]/g, "")[0] || "#"; return /[A-Za-z]/.test(c) ? c.toUpperCase() : "#"; };
const letters = {};
for (const x of artists) (letters[letterOf(x.name)] ??= []).push(x);

const regions = REGIONS.map((r) => ({ ...r, items: art.filter((a) => a.section === r.slug).sort(sortByDate) }));

// previous / next within the artwork's primary grouping
const primaryList = (a) => a.zips.length ? zipMap.get(a.zips[0]) : regions.find((r) => r.slug === a.section).items;
const nav = {};
for (const a of art) { const l = primaryList(a); const i = l.indexOf(a); nav[a.id] = { prev: l[i - 1] || null, next: l[i + 1] || null, label: a.zips[0] ? `ZIP ${a.zips[0]}` : regions.find((r) => r.slug === a.section).name }; }

const counts = Object.fromEntries(zips.filter((z) => z.inLA).map((z) => [z.zip, z.items.length]));
const years = [...new Set(art.map((a) => a.year))].sort();
export default { art, zips, neighborhoods, artists, letters, regions, nav, counts, years,
  stats: { artworks: art.length, zips: zips.length, laZips: Object.keys(counts).length, artists: artists.length, neighborhoods: neighborhoods.length, first: art[0].date, last: art[art.length - 1].date } };
