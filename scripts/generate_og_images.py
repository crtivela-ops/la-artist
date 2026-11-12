#!/usr/bin/env python3
"""Generate 1200x630 letterboxed JPEG Open Graph images for ArtCard.LA.

Cards are fitted (never cropped) onto the site's cream background. One JPEG is
written per published artwork, plus default.jpg for the homepage. Intended to
run after Eleventy so the files land in _site/assets/og/.
"""
from __future__ import annotations

import argparse
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path

from PIL import Image

W, H = 1200, 630
PAD = 48
MAT = 10
BG = (250, 248, 245)
QUALITY = 82
MAX_BYTES = 150_000

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "src" / "assets" / "art"
DEFAULT_PNG = ROOT / "src" / "assets" / "og-default.png"


def encode(im: Image.Image, quality: int) -> bytes:
    buf = BytesIO()
    im.save(buf, "JPEG", quality=quality, optimize=True, subsampling=2)
    return buf.getvalue()


def letterbox(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    canvas = Image.new("RGB", (W, H), BG)
    avail_w, avail_h = W - 2 * PAD, H - 2 * PAD
    inner_w, inner_h = max(1, avail_w - 2 * MAT), max(1, avail_h - 2 * MAT)
    scale = min(inner_w / im.width, inner_h / im.height)
    nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    mat_w, mat_h = nw + 2 * MAT, nh + 2 * MAT
    x, y = (W - mat_w) // 2, (H - mat_h) // 2
    canvas.paste((255, 255, 255), (x, y, x + mat_w, y + mat_h))
    canvas.paste(resized, (x + MAT, y + MAT))
    return canvas


def save_adaptive(im: Image.Image, dest: Path, quality: int = QUALITY) -> int:
    data = encode(im, quality)
    if len(data) > MAX_BYTES:
        for q in (80, 75, 70, 65):
            data = encode(im, q)
            if len(data) <= MAX_BYTES:
                break
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return len(data)


def render_card(job: tuple[str, str]) -> tuple[str, int]:
    src, dest = Path(job[0]), Path(job[1])
    size = save_adaptive(letterbox(src), dest)
    return src.stem, size


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default=str(ROOT / "_site" / "assets" / "og"))
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    sources = sorted(p for p in ART.glob("*.webp") if not p.name.endswith("-400.webp"))
    if not sources:
        print(f"error: no source cards in {ART}", file=sys.stderr)
        return 1

    t0 = time.time()
    jobs = [(str(p), str(out / f"{p.stem}.jpg")) for p in sources]
    sizes: list[int] = []
    with ProcessPoolExecutor() as pool:
        futs = [pool.submit(render_card, job) for job in jobs]
        for i, fut in enumerate(as_completed(futs), 1):
            _name, size = fut.result()
            sizes.append(size)
            if i % 200 == 0 or i == len(jobs):
                print(f"  {i}/{len(jobs)} card OG images", flush=True)

    missing = [Path(src).stem for src, dest in jobs if not Path(dest).exists()]
    if missing:
        print(f"error: missing {len(missing)} og images, e.g. {missing[:8]}", file=sys.stderr)
        return 1

    if not DEFAULT_PNG.exists():
        print(f"error: missing {DEFAULT_PNG}", file=sys.stderr)
        return 1
    home = Image.open(DEFAULT_PNG).convert("RGB")
    if home.size != (W, H):
        canvas = Image.new("RGB", (W, H), BG)
        home.thumbnail((W, H), Image.Resampling.LANCZOS)
        canvas.paste(home, ((W - home.width) // 2, (H - home.height) // 2))
        home = canvas
    default_size = save_adaptive(home, out / "default.jpg", quality=90)

    elapsed = time.time() - t0
    sizes.sort()
    print(
        f"wrote {len(jobs)} card JPEGs + default.jpg ({default_size} bytes) "
        f"to {out} in {elapsed:.1f}s"
    )
    print(
        f"card JPEG sizes: min={sizes[0]} median={sizes[len(sizes)//2]} "
        f"max={sizes[-1]} avg={sum(sizes)//len(sizes)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
