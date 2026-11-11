# ArtCard.LA — ArtCard archive (formerly LA-Artist.com) (static site)

Eleventy + Pagefind + Leaflet. 1,372 published ArtCards (2009–2015) organized by ZIP code, neighborhood and artist.

- `npm ci && npm run build` → `_site/`  (`npm run serve` for local dev)
- **Path prefix switch:** `PATH_PREFIX` in `eleventy.config.js` defaults to `/` for the custom domain https://artcard.la (`src/CNAME` is copied to `_site/CNAME`). For a project-path preview use `PATH_PREFIX=/la-artist/ npm run build`.
- `src/_data/artworks.json` and `src/assets/art/*.webp` are generated offline by `scripts/prepare_data.py` from the original WordPress backup (not in this repo). Only public fields are exported.
- `scripts/check_links.py _site /` checks every local link/image in the build.

ZIP boundaries: County of Los Angeles Enterprise GIS “Zipcodes” layer (simplified), used under the LA County GIS Data Portal Terms of Use. Map tiles © OpenStreetMap contributors. Artworks © their artists.
