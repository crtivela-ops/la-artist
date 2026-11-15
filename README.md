# ArtCard.LA

ArtCard.LA is a finished public archive of 1,372 postcards by 746 artists mailed across Los Angeles from 2009–2015. Submissions are closed. The site is maintained as a non-commercial record of Los Angeles mail art, live at [https://artcard.la](https://artcard.la) (formerly LA-Artist.com).

## Build and deploy

Node 22. After `npm ci` or `npm install`:

- `npx eleventy` builds the site into `_site/`
- `npx eleventy --serve` or `npm run serve` serves it locally
- `npm run build` also generates Open Graph images and runs Pagefind

`PATH_PREFIX` in `eleventy.config.js` defaults to `/` for the custom domain. `src/CNAME` (`artcard.la`) is copied into the build. For a project-path preview: `PATH_PREFIX=/la-artist/ npm run build`.

Pushes to `main` deploy to GitHub Pages via `.github/workflows/pages.yml`. DNS is at Porkbun and points `artcard.la` at GitHub Pages.

## Data

Published cards are in `src/_data/artworks.json`. Images live in `src/assets/art/`. Both were generated offline from the original public site data; only public fields are in this repo.

## Analytics, support, and contact

- Google Analytics 4 measurement ID: `G-QTS73YMS6C`
- Search Console property: `sc-domain:artcard.la`, under the owner's Google account
- Ko-fi: [https://ko-fi.com/artcard](https://ko-fi.com/artcard). The URL is set in `src/_data/site.json`
- Contact: [hello@artcard.la](mailto:hello@artcard.la)

## Preservation

`.github/workflows/uptime.yml` curls `https://artcard.la/` and `https://artcard.la/support/` every 30 minutes. A failed scheduled run emails the GitHub repo owner (`crtivela-ops`) by default, as long as Actions email notifications are on.

GitHub may disable scheduled workflows after 60 days with no repository activity (commits, pull requests, or issues). Workflow runs alone may not count. Re-enable the workflows from the Actions tab, or push a commit and use **Run workflow**.

`.github/workflows/wayback.yml` asks the Internet Archive to snapshot `/`, `/about/`, `/support/`, and `/map/` on the first of each month. Periodic crawls are still recommended.

Artworks remain © their artists. ZIP boundaries: County of Los Angeles Enterprise GIS, used under the LA County GIS Data Portal Terms of Use. Map tiles © OpenStreetMap contributors.
