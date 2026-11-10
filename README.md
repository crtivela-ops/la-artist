# LA-Artist.com ArtCard archive (static site)

Eleventy + Pagefind + Leaflet. 1,372 published ArtCards (2009–2015) organized by ZIP code, neighborhood and artist.

- `npm ci && npm run build` → `_site/`  (`npm run serve` for local dev)
- **Path prefix switch:** `PATH_PREFIX` in `eleventy.config.js` (`/la-artist/` for the GitHub project site, `/` for a custom domain), or `PATH_PREFIX=/ npm run build`.
  For a custom domain also change the two `/la-artist/` mentions in `.github/workflows/pages.yml` and add a CNAME.
- `src/_data/artworks.json` and `src/assets/art/*.webp` are generated offline by `scripts/prepare_data.py` from the original WordPress backup (not in this repo). Only public fields are exported.
- `scripts/check_links.py _site /la-artist/` checks every local link/image in the build.

ZIP boundaries: County of Los Angeles Enterprise GIS “Zipcodes” layer (simplified), used under the LA County GIS Data Portal Terms of Use. Map tiles © OpenStreetMap contributors. Artworks © their artists.
