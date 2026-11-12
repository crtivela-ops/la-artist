#!/usr/bin/env python3
"""Score every ArtCard for homepage-hero suitability and emit contact sheets of the top 25%.

Opt-in only — not part of `npm run build`. The curated, editable list is
src/_data/heroPool.json; this script must not overwrite that file. After a
rescore, visually review the contact sheets in design-review/hero-pool/ and
edit heroPool.json by hand.
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace/la-artist/site")
ART_DIR = ROOT / "src/assets/art"
OUT_DIR = Path("/workspace/la-artist/design-review/hero-pool")
OUT_DIR.mkdir(parents=True, exist_ok=True)

art = json.loads((ROOT / "src/_data/artworks.json").read_text())
quality = json.loads((ROOT / "src/_data/cardQuality.json").read_text())
featured = json.loads((ROOT / "src/_data/featured.json").read_text())
FEATURED = set(featured["hero"])


def load_rgb(path: Path):
    im = Image.open(path).convert("RGB")
    # work at max 400 on the long side for speed/consistency
    im.thumbnail((400, 400), Image.Resampling.BILINEAR)
    arr = np.asarray(im, dtype=np.float32) / 255.0
    return im.size, arr


def luma(rgb):
    return 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]


def laplacian_var(gray):
    g = np.pad(gray, 1, mode="edge")
    lap = g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:] - 4 * g[1:-1, 1:-1]
    return float(lap.var())


def colorfulness(rgb):
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    rg = r - g
    yb = 0.5 * (r + g) - b
    return float(np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2))


def sat_mean(rgb):
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    # saturation-like: chroma / lightness, avoid div0
    return float(np.mean(np.where(mx > 0.02, (mx - mn) / np.maximum(mx, 1e-6), 0)))


def pct_rank(values):
    """Percentile ranks in [0, 1], ties averaged."""
    x = np.asarray(values, dtype=np.float64)
    order = np.argsort(x, kind="mergesort")
    ranks = np.empty(len(x), dtype=np.float64)
    ranks[order] = np.arange(len(x))
    # average ties
    # (simple is enough; unique values get mid-ranks)
    _, inv, counts = np.unique(x, return_inverse=True, return_counts=True)
    starts = np.cumsum(counts) - counts
    mids = starts + (counts - 1) / 2.0
    out = mids[inv] / max(len(x) - 1, 1)
    return out


rows = []
missing = 0
for a in art:
    path = ART_DIR / f"{a['id']}-400.webp"
    if not path.exists():
        path = ART_DIR / f"{a['id']}.webp"
    if not path.exists():
        missing += 1
        continue
    (tw, th), rgb = load_rgb(path)
    y = luma(rgb)
    sharp = laplacian_var(y)
    colorful = colorfulness(rgb)
    contrast = float(np.percentile(y, 90) - np.percentile(y, 10))
    y_std = float(y.std())
    y_mean = float(y.mean())
    white_frac = float((y > 0.92).mean())
    near_white = float((y > 0.85).mean())
    dark_frac = float((y < 0.12).mean())
    # local uniformity: downsample and measure low-variance patches
    # blank / empty paper
    blank = max(0.0, (near_white - 0.55) / 0.45)  # 0 at 55% light, 1 at 100%
    # washed-out: high mean, low contrast, low chroma
    sat = sat_mean(rgb)
    washed = 0.0
    if contrast < 0.35 and y_mean > 0.55:
        washed = min(1.0, (0.35 - contrast) / 0.35 * (0.4 + (1 - min(sat / 0.25, 1))))
    # text-only: lots of paper, little color, but some ink edges (letters)
    # high sharpness relative to color, high white, bimodal-ish
    texty = 0.0
    if near_white > 0.45 and sat < 0.18 and contrast > 0.20:
        # scale up as color drops and paper rises
        texty = min(1.0, ((near_white - 0.45) / 0.4) * (1 - sat / 0.18) * min(1.0, contrast / 0.4))
    # very low edge energy + high white = blank letter, already in blank
    px = a["w"] * a["h"]
    ratio = max(a["w"], a["h"]) / min(a["w"], a["h"])
    aspect_pen = abs(ratio - 1.5)  # 0 is perfect 3:2 / 4x6
    rows.append({
        "id": a["id"],
        "artist": a["artist"],
        "artistSlug": a["artistSlug"],
        "slug": a["slug"],
        "w": a["w"],
        "h": a["h"],
        "px": px,
        "aspect": round(ratio, 3),
        "aspect_pen": round(aspect_pen, 4),
        "sharp": sharp,
        "color": colorful,
        "contrast": contrast,
        "y_std": y_std,
        "y_mean": y_mean,
        "sat": sat,
        "white": near_white,
        "white92": white_frac,
        "blank": round(blank, 3),
        "washed": round(washed, 3),
        "texty": round(texty, 3),
        "prior": quality.get(str(a["id"])),
        "featured": a["id"] in FEATURED,
    })

print(f"scored {len(rows)} missing {missing}")

# Rank-normalize positive features; resolution via log pixels
px_log = [math.log(r["px"]) for r in rows]
sharp_p = pct_rank([r["sharp"] for r in rows])
color_p = pct_rank([r["color"] for r in rows])
cont_p = pct_rank([r["contrast"] for r in rows])
res_p = pct_rank(px_log)
# aspect: full credit within 0.08 of 1.5, zero by 0.4 away
asp_s = [max(0.0, 1.0 - r["aspect_pen"] / 0.4) for r in rows]
# prior quality (2.4–4.53 among 347); missing = 0.35 mid-low so it helps known-good cards without zeroing others
prior_raw = []
for r in rows:
    if r["prior"] is None:
        prior_raw.append(None)
    else:
        prior_raw.append(r["prior"])
prior_vals = [p for p in prior_raw if p is not None]
pmin, pmax = min(prior_vals), max(prior_vals)
prior_s = [0.35 if p is None else (p - pmin) / (pmax - pmin) for p in prior_raw]

weights = dict(sharp=0.26, color=0.18, contrast=0.14, res=0.10, aspect=0.08, prior=0.10)
# penalties subtracted
for i, r in enumerate(rows):
    base = (
        weights["sharp"] * sharp_p[i]
        + weights["color"] * color_p[i]
        + weights["contrast"] * cont_p[i]
        + weights["res"] * res_p[i]
        + weights["aspect"] * asp_s[i]
        + weights["prior"] * prior_s[i]
    )
    penalty = 0.22 * r["blank"] + 0.16 * r["washed"] + 0.18 * r["texty"]
    r["score"] = round(max(0.0, base - penalty) * 100, 3)
    r["sharp_p"] = round(float(sharp_p[i]), 3)
    r["color_p"] = round(float(color_p[i]), 3)
    r["cont_p"] = round(float(cont_p[i]), 3)
    r["res_p"] = round(float(res_p[i]), 3)

rows.sort(key=lambda r: (-r["score"], r["id"]))
n = len(rows)
cut_n = int(round(n * 0.25))
top = rows[:cut_n]
print(f"top 25% cutoff: {cut_n} cards, score >= {top[-1]['score']}")
print(f"score range all: {rows[-1]['score']}–{rows[0]['score']}; top mean {sum(t['score'] for t in top)/len(top):.2f}")
print(f"featured in top 25%? {[r['id'] for r in top if r['featured']]} ({sum(1 for r in top if r['featured'])}/12)")
missing_feat = [i for i in featured["hero"] if i not in {r['id'] for r in top}]
print("featured NOT in top 25%:", missing_feat)
for i in missing_feat:
    r = next(x for x in rows if x["id"] == i)
    print(f"  {i} {r['artist']} score={r['score']} rank={rows.index(r)+1} blank={r['blank']} washed={r['washed']} texty={r['texty']} sharp_p={r['sharp_p']} color_p={r['color_p']}")

# artist cap preview
by_artist = defaultdict(list)
for r in top:
    by_artist[r["artistSlug"]].append(r)
capped = []
dropped_cap = 0
for slug, items in by_artist.items():
    items = sorted(items, key=lambda r: (-r["score"], r["id"]))
    # always keep featured even if 3rd? we'll keep featured + cap 2
    keep = items[:2]
    # if a featured card would be dropped, swap it in
    feat = [x for x in items[2:] if x["featured"]]
    if feat:
        # replace lowest kept non-featured if needed
        for f in feat:
            non = [k for k in keep if not k["featured"]]
            if non:
                keep.remove(min(non, key=lambda r: r["score"]))
                keep.append(f)
    dropped_cap += len(items) - len(keep)
    capped.extend(keep)
capped.sort(key=lambda r: (-r["score"], r["id"]))
print(f"after max 2/artist on top 25%: {len(capped)} (dropped {dropped_cap} extras)")
print(f"artists in capped set: {len({r['artistSlug'] for r in capped})}")

# write metrics
(OUT_DIR / "scores.json").write_text(json.dumps({
    "n": n,
    "top25": cut_n,
    "cutoff": top[-1]["score"],
    "capped": len(capped),
    "rows": rows,
}, indent=1))
(OUT_DIR / "top25_ids.json").write_text(json.dumps([r["id"] for r in top]))
(OUT_DIR / "capped_ids.json").write_text(json.dumps([r["id"] for r in capped]))

# contact sheets of capped list (the review set), 8 cols, 40 per sheet
def sheet(cards, path, title):
    cols = 8
    thumb_w, label_h, pad = 200, 36, 6
    # height from aspect later; use fixed cell
    cell_w = thumb_w + pad * 2
    cell_h = int(thumb_w / 1.5) + label_h + pad * 2
    rows_n = math.ceil(len(cards) / cols)
    W = cols * cell_w
    H = 40 + rows_n * cell_h
    im = Image.new("RGB", (W, H), (250, 248, 245))
    draw = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
        fontb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
    except Exception:
        font = fontb = ImageFont.load_default()
    draw.text((10, 10), title, fill=(29, 27, 32), font=fontb)
    for i, r in enumerate(cards):
        c, rr = i % cols, i // cols
        x, y = c * cell_w + pad, 40 + rr * cell_h + pad
        p = ART_DIR / f"{r['id']}-400.webp"
        if not p.exists():
            p = ART_DIR / f"{r['id']}.webp"
        th = Image.open(p).convert("RGB")
        tw = thumb_w
        th.thumbnail((tw, int(tw / 1.2)), Image.Resampling.LANCZOS)
        # center in image area
        ih = int(thumb_w / 1.5)
        box = Image.new("RGB", (thumb_w, ih), (230, 226, 220))
        ox = (thumb_w - th.width) // 2
        oy = (ih - th.height) // 2
        box.paste(th, (max(0, ox), max(0, oy)))
        im.paste(box, (x, y))
        mark = "*" if r.get("featured") else ""
        flags = []
        if r["blank"] > 0.3:
            flags.append("blank")
        if r["washed"] > 0.3:
            flags.append("wash")
        if r["texty"] > 0.3:
            flags.append("text")
        fl = (" " + ",".join(flags)) if flags else ""
        label = f"{r['id']}{mark}  {r['score']:.1f}  {r['artist'][:22]}{fl}"
        draw.text((x, y + ih + 2), label, fill=(29, 27, 32), font=font)
    im.save(path, "PNG", optimize=True)
    print("wrote", path, "n=", len(cards), "size", im.size)

# sheets of 40
for i in range(0, len(capped), 40):
    chunk = capped[i:i+40]
    n1, n2 = i + 1, i + len(chunk)
    sheet(chunk, OUT_DIR / f"sheet-{n1:03d}-{n2:03d}.png",
          f"Hero candidates after score + max 2/artist  ({n1}–{n2} of {len(capped)}; * = current featured)")

# also a sheet of featured that missed the cut, and bottom of top25 (weakest of the cut) for calibration
weak = top[-40:]
sheet(weak, OUT_DIR / "sheet-weakest-top25.png", "Weakest of raw top 25% (before artist cap) — calibration")
print("done")
