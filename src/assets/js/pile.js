// Homepage "shoebox" pile. Picks and scatters the day's cards from the inline
// card list (data-pile-cards). No libraries. The <noscript> pile is the fallback.
import { laDate, dailyPile } from "./pile-layout.mjs";

const table = document.querySelector("[data-pile]");
const src = document.getElementById("pile-cards");
if (table && src) {
  const P = table.dataset.prefix || "/";
  const cards = JSON.parse(src.textContent); // [slug, id, artist, zip, tw, th]
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const mode = () => (matchMedia("(max-width: 640px)").matches ? "narrow" : matchMedia("(max-width: 960px)").matches ? "mid" : "wide");
  let shown = null;
  function render() {
    const m = mode(); if (m === shown) return; shown = m;
    const day = laDate();
    table.dataset.day = day;
    table.innerHTML = dailyPile(cards.length, day, m).map(({ i, x, y, r, z }) => {
      const [slug, id, artist, zip, w, h] = cards[i];
      const alt = "ArtCard by " + artist + (zip ? ", ZIP " + zip : "");
      return `<a class="pile-card" href="${P}art/${slug}/" style="--x:${x}%;--y:${y}%;--r:${r}deg;z-index:${z}"><img src="${P}assets/art/${id}-400.webp" width="${w}" height="${h}" decoding="async" alt="${esc(alt)}"></a>`;
    }).join("");
  }
  render();
  addEventListener("resize", render, { passive: true });
}
