// Homepage card grid: today's selection (LA date) from the inline card list.
// No libraries. The <noscript> grids are the fallback.
import { laDate, dailyGrid, EAGER_ROWS } from "./grid-layout.mjs";

const box = document.querySelector("[data-daily]");
const src = document.getElementById("daily-cards");
if (box && src) {
  const P = box.dataset.prefix || "/";
  const cards = JSON.parse(src.textContent); // [slug, id, artist, zip, tw, th, artistSlug, w]
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const mode = () => (matchMedia("(max-width: 640px)").matches ? "narrow" : matchMedia("(max-width: 960px)").matches ? "mid" : "wide");
  const SIZES = { wide: ["200px", "400px"], mid: ["25vw", "50vw"], narrow: ["50vw", "100vw"] };
  let shown = null;
  function render() {
    const m = mode(); if (m === shown) return; shown = m;
    const day = laDate();
    box.dataset.day = day;
    box.innerHTML = `<ul class="tiles tiles-${m}">` + dailyGrid(cards, day, m).map(({ i, col, row, cs, rs, big }) => {
      const [, id, artist, zip, tw, th, aslug, w] = cards[i];
      const label = artist + (zip ? ", ZIP " + zip : "");
      const lazy = row > EAGER_ROWS[m] ? ' loading="lazy"' : "";
      return `<li style="grid-column:${col}/span ${cs};grid-row:${row}/span ${rs}"><a class="tile" href="${P}artist/${aslug}/"><img src="${P}assets/art/${id}-400.webp" srcset="${P}assets/art/${id}-400.webp ${tw}w, ${P}assets/art/${id}.webp ${w}w" sizes="${SIZES[m][big ? 1 : 0]}" width="${tw}" height="${th}"${lazy} decoding="async" alt="ArtCard by ${esc(label)}"><span class="tile-cap">${esc(artist)}${zip ? " <i>" + zip + "</i>" : ""}</span></a></li>`;
    }).join("") + "</ul>";
  }
  render();
  addEventListener("resize", render, { passive: true });
}
