"""Build public data + images for the LA-Artist static site from ../artworks.json.
Only status=publish rows. Only public fields. Writes src/_data/*.json and src/assets/art/*.webp"""
import json, re, os, sqlite3, collections, unicodedata, html
from PIL import Image, ImageOps
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # site/
ROOT = os.path.dirname(BASE)                                          # la-artist/
UP = os.path.join(ROOT, 'files/home/laartist/www/www/')
OUT_IMG = os.path.join(BASE, 'src/assets/art')
DATA = os.path.join(BASE, 'src/_data')
os.makedirs(OUT_IMG, exist_ok=True)

rows = [r for r in json.load(open(os.path.join(ROOT, 'artworks.json'))) if r['status'] == 'publish']
la_zips = {f['properties']['ZIPCODE'] for f in json.load(open(os.path.join(BASE, 'src/assets/la_zips.geojson')))['features']}

def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')
    return s or 'x'

# --- conservative artist merges -------------------------------------------
norm = lambda a: re.sub(r'[^a-z0-9]', '', a.lower())
MANUAL = {  # variant -> canonical (same ZIP, clear one-letter typo or dropped middle initial)
 'Amanda Ferell Hale': 'Amanda Ferrell Hale', 'Mark Ecinas': 'Mark Encinas',
 'Nellie Adallie Ruiz': 'Nellie Adalie Ruiz', 'Liliam Revheim': 'Liliam P. Revheim',
 'John Maranoa': 'John Maranda', 'Joanne Chase-Matillo': 'Joanne Chase-Mattillo',
 'Blake Myvette': 'Blake Myvett', 'Ryan Y. Boyd': 'Ryan J. Boyd', 'Tammy Boyle': 'Tammy Boule',
 'Devin Gibson': 'Devin D. Gibson', 'Marcos Leandro': 'Marcos A. Leandro',
 'Cecolia Wallace': 'Cecilia Wallace', 'Alondra Rodriquez': 'Alondra Rodriguez',
 'Samanthe Henry': 'Samantha Henry', 'Daniel Hiolalgo': 'Daniel Hidalgo',
 'Liliam': 'Liliam P. Revheim', 'Larry S': 'Larry Swanson',   # confirmed by Oliver, Nov 10 2026
}
merges = []
for r in rows:
    a = (r['artist'] or '').strip()
    if not a or a.lower() in ('unknown', 'anonymous'): a = 'Unknown artist'
    if a in MANUAL: merges.append((a, MANUAL[a], r['id'])); a = MANUAL[a]
    r['_artist'] = a
groups = collections.defaultdict(collections.Counter)
for r in rows: groups[norm(r['_artist'])][r['_artist']] += 1
canon = {}
for k, c in groups.items():
    best = sorted(c.items(), key=lambda kv: (-kv[1], kv[0] != kv[0].title(), kv[0]))[0][0]
    for v in c:
        canon[v] = best
        if v != best: merges.append((v, best, None))
for r in rows: r['_artist'] = canon[r['_artist']]

# --- sections ----------------------------------------------------------------
REGION_SLUG = {'Outside LA (California)': ('outside-la', 'Outside LA / California'),
               'Other U.S. state': ('us-states', 'U.S. States'),
               'International': ('international', 'International')}
NEIGH_EXCLUDE = {'ArtCard', 'Unknown', 'News & Events'}
issues = []
db = sqlite3.connect(os.path.join(ROOT, 'artcard.sqlite'))
cat_slug = {}; cat_parent = {}
for name, slug, tid, parent in db.execute("select t.name,t.slug,t.term_id,tt.parent from wp_terms t join wp_term_taxonomy tt using(term_id) where taxonomy='category'"):
    cat_slug[html.unescape(name).strip()] = slug; cat_parent[tid] = parent
INVALID_ZIPS = {'90126', '90336'}   # not real USPS ZIPs
post_slug = dict(db.execute("select ID,post_name from wp_posts where post_type='post'").fetchall())
art = []
for r in rows:
    r['slug'] = post_slug.get(r['id']) or ''
    zips = [z for z in r['zip'].split('; ') if z]
    bad = [z for z in zips if z in INVALID_ZIPS]
    if bad: issues.append(f"post {r['id']} ({r['_artist']}): ZIP {', '.join(bad)} is not a real ZIP code; shown without a ZIP")
    zips = [z for z in zips if z not in INVALID_ZIPS]
    regions = [x for x in r['region'].split('; ') if x]
    lz = [z for z in zips if z in la_zips]
    if lz: section = 'la'
    elif 'International' in regions: section = 'international'
    elif 'Other U.S. state' in regions: section = 'us-states'
    elif zips or 'Outside LA (California)' in regions: section = 'outside-la'
    else: section = 'unknown'
    neigh = [n for n in r['neighborhood'].split('; ') if n and n not in NEIGH_EXCLUDE]
    place = []
    if section in ('international', 'us-states'): place, neigh = neigh, []
    f = r['image_files'].split('; ')[0]
    src = os.path.join(UP, f)
    full = os.path.join(OUT_IMG, f"{r['id']}.webp"); thumb = os.path.join(OUT_IMG, f"{r['id']}-400.webp")
    im = Image.open(src); im = ImageOps.exif_transpose(im).convert('RGB')
    w, h = im.size
    if w > 1000 or h > 1000: im.thumbnail((1000, 1000), Image.LANCZOS)
    fw, fh = im.size
    if not os.path.exists(full): im.save(full, 'WEBP', quality=80, method=5)
    t = im.copy(); t.thumbnail((400, 400), Image.LANCZOS)
    if not os.path.exists(thumb): t.save(thumb, 'WEBP', quality=75, method=5)
    art.append(dict(id=r['id'], slug=r['slug'] or str(r['id']), artist=r['_artist'], artistSlug=slugify(r['_artist']),
                    zips=zips, laZips=lz, section=section,
                    neighborhoods=[dict(name=n, slug=cat_slug.get(n, slugify(n))) for n in neigh],
                    place=place, date=r['date'], year=r['date'][:4], w=fw, h=fh, tw=t.size[0], th=t.size[1],
                    oldUrl=r['old_url']))
# unique artwork slugs
seen = collections.Counter(a['slug'] for a in art)
for a in art:
    if seen[a['slug']] > 1: a['slug'] = f"{a['slug']}-{a['id']}"
# unique artist slugs
aslug = {}
for a in art:
    s = a['artistSlug']; aslug.setdefault(s, set()).add(a['artist'])
for s, names in aslug.items():
    if len(names) > 1:
        for a in art:
            if a['artistSlug'] == s: a['artistSlug'] = s + '-' + slugify(str(sorted(names).index(a['artist'])))
art.sort(key=lambda a: a['date'])
json.dump(art, open(os.path.join(DATA, 'artworks.json'), 'w'), ensure_ascii=False)
json.dump(dict(merges=sorted(set((a, b) for a, b, _ in merges)), issues=issues),
          open(os.path.join(ROOT, 'site_data_report.json'), 'w'), indent=1, ensure_ascii=False)

# --- redirects from old WordPress URLs ---------------------------------------
redirects = {}
def add(old, new):
    old = '/' + old.strip('/') + '/'
    if old != new: redirects.setdefault(old, new)
for a in art:
    new = f"/art/{a['slug']}/"
    y, m = a['date'][:4], a['date'][5:7]
    s = a['slug'].rsplit('-' + str(a['id']), 1)[0] if a['slug'].endswith('-' + str(a['id'])) else a['slug']
    for old in (f"{s}", f"{s}/{y}/{m}", f"{y}/{m}/{s}"):
        add(old, new)
# custom permalinks
for pid, val in db.execute("select post_id,meta_value from wp_postmeta where meta_key='_custom_permalink'"):
    a = next((x for x in art if x['id'] == pid), None)
    if a and val: add(val, f"/art/{a['slug']}/")
# category (base /neighborhood) and tag (base /profile) archives
tid_slug = {tid: slug for slug, tid in db.execute("select t.slug,t.term_id from wp_terms t join wp_term_taxonomy tt using(term_id) where taxonomy='category'")}
used_neigh = {n['slug'] for a in art for n in a['neighborhoods']}
used_zip = {z for a in art for z in a['zips']}
for name, slug, tid, parent in db.execute("select t.name,t.slug,t.term_id,tt.parent from wp_terms t join wp_term_taxonomy tt using(term_id) where taxonomy='category'"):
    name = html.unescape(name).strip()
    if re.fullmatch(r'\d{5}', name) and name in used_zip: target = f"/zip/{name}/"
    elif name in ('X-California-X',): target = '/region/outside-la/'
    elif name == 'x-International-x': target = '/region/international/'
    elif name == 'x-U.S. States-x': target = '/region/us-states/'
    elif name == 'Unknown': target = '/region/unknown/'
    elif slug in used_neigh: target = None  # new page lives at the same /neighborhood/<slug>/ path
    else: target = '/'
    path = [slug]; p = parent
    while p and p in tid_slug: path.insert(0, tid_slug[p]); p = cat_parent.get(p)
    for old in {f"neighborhood/{slug}", "neighborhood/" + '/'.join(path)}:
        if target: add(old, target)
        elif old != f"neighborhood/{slug}": add(old, f"/neighborhood/{slug}/")
artist_by_norm = {norm(a['artist']): a['artistSlug'] for a in art}
for name, slug in db.execute("select t.name,t.slug from wp_terms t join wp_term_taxonomy tt using(term_id) where taxonomy='post_tag'"):
    n = norm(canon.get(MANUAL.get(html.unescape(name), html.unescape(name)), html.unescape(name)))
    if n in artist_by_norm: add(f"profile/{slug}", f"/artist/{artist_by_norm[n]}/")
for old, new in [('artcard-map', '/map/'), ('neighborhood-art-archives', '/zips/'), ('artcard', '/about/'), ('participate-3', '/about/'), ('get-involved', '/about/'), ('books', '/about/'), ('documentary-film', '/about/'), ('terms', '/terms-of-use/'), ('privacy', '/privacy-policy/')]:
    add(old, new)
# old artist-page addresses from the first preview, now merged
for old, new in [('artist/liliam', '/artist/liliam-p-revheim/'), ('artist/larry-s', '/artist/larry-swanson/')]:
    redirects[f'/{old}/'] = new
RESERVED = ('terms-of-use', 'privacy-policy', 'art', 'artist', 'artists', 'zip', 'zips', 'neighborhood', 'neighborhoods', 'region', 'map', 'search', 'about', 'assets', 'pagefind')
redirects = {o: n for o, n in redirects.items() if not (o.strip('/') in RESERVED or (o.split('/')[1] in ('art', 'artist', 'zip', 'region', 'assets', 'pagefind') and o not in ('/artist/liliam/', '/artist/larry-s/')))
             and not (o.startswith('/neighborhood/') and o.count('/') == 3 and o.split('/')[2] in used_neigh)}
json.dump([dict(old=o, new=n) for o, n in sorted(redirects.items())], open(os.path.join(DATA, 'redirects.json'), 'w'))
print(len(art), 'artworks;', len(redirects), 'redirects;', len(set(a['artist'] for a in art)), 'artists;', len(merges), 'merge events;', len(issues), 'issues')
print(collections.Counter(a['section'] for a in art))
