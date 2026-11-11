import fs from "node:fs";

const art = JSON.parse(fs.readFileSync(new URL("./artworks.json", import.meta.url)));
const featured = JSON.parse(fs.readFileSync(new URL("./featured.json", import.meta.url)));
const quality = JSON.parse(fs.readFileSync(new URL("./cardQuality.json", import.meta.url)));
const byId = new Map(art.map((a) => [a.id, a]));

const STANDINGS_PER_WEEK = 6;
const CARDS_PER_HOOD = 3;
const SKIP_HOOD_SLUGS = new Set(["japan"]); // tagged on some LA cards; not a reliable neighborhood

function resolveList(ids, label) {
  return ids.map((id) => {
    const a = byId.get(id);
    if (!a) throw new Error(`featured.json ${label} id ${id} is not in artworks.json`);
    return a;
  });
}

function pacificYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function mostRecentSunday(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return addDays(ymd, -dt.getUTCDay());
}

// ISO week of a YYYY-MM-DD date (UTC calendar date, no timezone shift).
function isoWeek(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Thursday of this week determines the ISO year
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return { isoYear, isoWeek: isoWeekNum };
}

function weekLabel(sunday, saturday) {
  const fmt = (ymd, withYear) => {
    const [y, m, d] = ymd.split("-").map(Number);
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return withYear ? `${months[m - 1]} ${d}, ${y}` : `${months[m - 1]} ${d}`;
  };
  const sy = sunday.slice(0, 4);
  const ey = saturday.slice(0, 4);
  if (sunday.slice(0, 7) === saturday.slice(0, 7)) {
    const [ , m, d] = saturday.split("-").map(Number);
    return `Week of ${fmt(sunday, false)}–${d}, ${ey}`;
  }
  if (sy === ey) return `Week of ${fmt(sunday, false)} – ${fmt(saturday, true)}`;
  return `Week of ${fmt(sunday, true)} – ${fmt(saturday, true)}`;
}

function displayWeek(now = new Date()) {
  const offset = Number(process.env.HOMEPAGE_WEEK_OFFSET || 0);
  let ymd = pacificYmd(now);
  if (process.env.HOMEPAGE_WEEK) {
    // Accept YYYY-MM-DD (any date in the week) or YYYY-Www
    const raw = process.env.HOMEPAGE_WEEK.trim();
    const iso = raw.match(/^(\d{4})-W(\d{1,2})$/i);
    if (iso) {
      // Thursday of that ISO week, then step to its Sunday (ISO week ends Sunday)
      const isoYear = +iso[1];
      const isoWeekNum = +iso[2];
      const jan4 = new Date(Date.UTC(isoYear, 0, 4));
      const mon = new Date(jan4);
      mon.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (isoWeekNum - 1) * 7);
      const sun = new Date(mon);
      sun.setUTCDate(mon.getUTCDate() + 6);
      ymd = sun.toISOString().slice(0, 10);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      ymd = raw;
    } else {
      throw new Error(`HOMEPAGE_WEEK must be YYYY-MM-DD or YYYY-Www, got ${raw}`);
    }
  }
  if (offset) ymd = addDays(ymd, offset * 7);
  const sunday = mostRecentSunday(ymd);
  const saturday = addDays(sunday, 6);
  const { isoYear, isoWeek: isoWeekNum } = isoWeek(sunday);
  // Sequential index so each Sunday advances the rotation by one “page”
  const weekIndex = Math.round((Date.parse(sunday + "T00:00:00Z") - Date.UTC(2009, 0, 4)) / 604800000);
  return { sunday, saturday, isoYear, isoWeek: isoWeekNum, weekIndex, label: weekLabel(sunday, saturday) };
}

function primaryHood(a) {
  for (const h of a.neighborhoods || []) {
    if (!SKIP_HOOD_SLUGS.has(h.slug)) return h;
  }
  return null;
}

function slim(a) {
  return {
    id: a.id,
    slug: a.slug,
    artist: a.artist,
    artistSlug: a.artistSlug,
    w: a.w,
    h: a.h,
    tw: a.tw,
    th: a.th,
    year: a.year,
    zips: a.zips,
    neighborhoods: a.neighborhoods,
  };
}

function standoutsFor(week, heroIds) {
  const exclude = new Set(heroIds);
  const byHood = new Map();
  for (const a of art) {
    if (exclude.has(a.id)) continue;
    if (a.section !== "la") continue;
    if (quality[String(a.id)] == null) continue;
    const hood = primaryHood(a);
    if (!hood) continue;
    if (!byHood.has(hood.slug)) {
      byHood.set(hood.slug, { slug: hood.slug, name: hood.name, items: [] });
    }
    byHood.get(hood.slug).items.push(a);
  }

  // Archive totals (all LA cards with this primary neighborhood, not just quality pool)
  const archiveCounts = new Map();
  for (const a of art) {
    if (a.section !== "la") continue;
    const hood = primaryHood(a);
    if (!hood) continue;
    archiveCounts.set(hood.slug, (archiveCounts.get(hood.slug) || 0) + 1);
  }

  const eligible = [...byHood.values()]
    .filter((h) => h.items.length >= CARDS_PER_HOOD)
    .map((h) => {
      const ranked = [...h.items].sort((a, b) => {
        const ds = (quality[String(b.id)] || 0) - (quality[String(a.id)] || 0);
        return ds || a.id - b.id;
      });
      // One card per artist, keeping the higher-scored one
      const seen = new Set();
      const unique = [];
      for (const a of ranked) {
        if (seen.has(a.artistSlug)) continue;
        seen.add(a.artistSlug);
        unique.push(a);
      }
      return {
        slug: h.slug,
        name: h.name,
        ranked: unique,
        archiveCount: archiveCounts.get(h.slug) || h.items.length,
      };
    })
    .filter((h) => h.ranked.length >= CARDS_PER_HOOD)
    .sort((a, b) => a.slug.localeCompare(b.slug) || a.name.localeCompare(b.name));

  if (eligible.length === 0) {
    return { ...week, neighborhoods: [], eligibleCount: 0 };
  }

  const start = ((week.weekIndex * STANDINGS_PER_WEEK) % eligible.length + eligible.length) % eligible.length;
  const picked = [];
  for (let i = 0; i < Math.min(STANDINGS_PER_WEEK, eligible.length); i++) {
    picked.push(eligible[(start + i) % eligible.length]);
  }

  const neighborhoods = picked.map((h) => {
    // When a neighborhood returns in a later week, shift into the ranked list
    // so the same three cards are not always shown.
    const offset = h.ranked.length > CARDS_PER_HOOD
      ? ((week.weekIndex * CARDS_PER_HOOD) % h.ranked.length)
      : 0;
    const cards = [];
    for (let i = 0; i < h.ranked.length && cards.length < CARDS_PER_HOOD; i++) {
      cards.push(h.ranked[(offset + i) % h.ranked.length]);
    }
    return {
      slug: h.slug,
      name: h.name,
      archiveCount: h.archiveCount,
      cards: cards.map(slim),
    };
  });

  return { ...week, neighborhoods, eligibleCount: eligible.length };
}

const hero = resolveList(featured.hero, "hero");
const classics = resolveList(featured.classics, "classics");
const week = displayWeek();
const standouts = standoutsFor(week, featured.hero);

export default { hero, classics, standouts };
