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

// Unique titles/descriptions and JSON-LD fragments (real data only).
const SITE_URL = process.env.SITE_URL ?? "https://artcard.la";
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const niceDate = (d) => { const [y, m, dd] = d.split("-"); return `${months[+m - 1]} ${+dd}, ${y}`; };
const shortTitle = (a) => `ArtCard by ${a.artist}` + (a.zips[0] ? `, ${a.zips[0]}` : "");
const datedTitle = (a) => `${shortTitle(a)}, ${niceDate(a.date)}`;
const shortCounts = new Map();
for (const a of art) shortCounts.set(shortTitle(a), (shortCounts.get(shortTitle(a)) || 0) + 1);
const datedCounts = new Map();
for (const a of art) {
  if (shortCounts.get(shortTitle(a)) > 1) datedCounts.set(datedTitle(a), (datedCounts.get(datedTitle(a)) || 0) + 1);
}
for (const a of art) {
  const short = shortTitle(a);
  let title = short;
  let uniqueId = false;
  if (shortCounts.get(short) > 1) {
    const dated = datedTitle(a);
    if ((datedCounts.get(dated) || 0) > 1) { title = `${dated} (#${a.id})`; uniqueId = true; }
    else title = dated;
  }
  let description = `ArtCard by ${a.artist}`;
  if (a.zips.length) description += ` from ZIP ${a.zips.join(", ")}`;
  if (a.neighborhoods[0]) description += ` (${a.neighborhoods[0].name})`;
  description += `, posted ${niceDate(a.date)}`;
  if (uniqueId) description += ` (card #${a.id})`;
  description += ".";
  a.seoTitle = title;
  a.seoDescription = description;
  a.jsonLd = {
    "@type": "VisualArtwork",
    name: title,
    url: `${SITE_URL}/art/${a.slug}/`,
    image: { "@type": "ImageObject", url: `${SITE_URL}/assets/art/${a.id}.webp`, width: a.w, height: a.h },
    creator: { "@type": "Person", name: a.artist, url: `${SITE_URL}/artist/${a.artistSlug}/` },
    copyrightHolder: { "@type": "Person", name: a.artist },
    license: "https://creativecommons.org/licenses/by-nc-sa/3.0/us/",
    dateCreated: a.date,
    artform: "Mail art",
    artMedium: "Postcard",
  };
}
for (const x of artists) {
  const url = `${SITE_URL}/artist/${x.slug}/`;
  x.seoDescription = `${x.items.length === 1 ? "1 ArtCard" : `${x.items.length} ArtCards`} by ${x.name}` + (x.zips.length ? ` from ZIP ${x.zips.join(", ")}` : "") + ".";
  x.jsonLd = [
    { "@type": "Person", "@id": `${url}#person`, name: x.name, url },
    { "@type": "CollectionPage", url, name: `ArtCards by ${x.name}`, mainEntity: { "@id": `${url}#person` } },
  ];
}
for (const z of zips) {
  const hoods = z.neighborhoods.map((n) => n.name);
  z.seoTitle = `ArtCards from ZIP ${z.zip}` + (hoods.length === 1 ? `, ${hoods[0]}` : "");
  z.seoDescription = `${z.items.length === 1 ? "1 ArtCard" : `${z.items.length} ArtCards`} mailed from ZIP code ${z.zip}` + (hoods.length ? ` (${hoods.join(", ")})` : "") + (z.inLA ? "" : ", outside Los Angeles County") + ".";
  z.jsonLd = { "@type": "CollectionPage", url: `${SITE_URL}/zip/${z.zip}/`, name: z.seoTitle, mainEntity: { "@type": "Collection", name: z.seoTitle, numberOfItems: z.items.length } };
}
for (const n of neighborhoods) {
  n.seoTitle = `ArtCards from ${n.name}`;
  n.seoDescription = `${n.items.length === 1 ? "1 ArtCard" : `${n.items.length} ArtCards`} mailed from ${n.name}` + (n.zips.length ? `, ZIP ${n.zips.join(", ")}` : "") + ".";
  n.jsonLd = { "@type": "CollectionPage", url: `${SITE_URL}/neighborhood/${n.slug}/`, name: n.seoTitle, mainEntity: { "@type": "Collection", name: n.seoTitle, numberOfItems: n.items.length } };
}
for (const r of regions) {
  r.seoDescription = `${r.blurb} ${r.items.length === 1 ? "1 ArtCard" : `${r.items.length} ArtCards`}.`;
  r.jsonLd = { "@type": "CollectionPage", url: `${SITE_URL}/region/${r.slug}/`, name: r.name, mainEntity: { "@type": "Collection", name: r.name, numberOfItems: r.items.length } };
}

export default { art, zips, neighborhoods, artists, letters, regions, nav, counts, years,
  stats: { artworks: art.length, zips: zips.length, laZips: Object.keys(counts).length, artists: artists.length, neighborhoods: neighborhoods.length, first: art[0].date, last: art[art.length - 1].date } };
