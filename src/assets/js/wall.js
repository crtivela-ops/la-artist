(function () {
  const wall = document.getElementById('wall'); if (!wall) return;
  const P = wall.dataset.prefix || '/';
  let data = null;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function render() {
    const pick = []; const used = new Set();
    while (pick.length < 30 && pick.length < data.length) { const i = Math.floor(Math.random() * data.length); if (!used.has(i)) { used.add(i); pick.push(data[i]); } }
    wall.innerHTML = '<ul class="grid">' + pick.map(([slug, id, artist, zip, w, h]) =>
      `<li><a class="card" href="${P}art/${slug}/"><img src="${P}assets/art/${id}-400.webp" width="${w}" height="${h}" loading="lazy" decoding="async" alt="ArtCard by ${esc(artist)}${zip ? ', ZIP ' + zip : ''}"><span class="cap"><b>${esc(artist)}</b>${zip ? ' <i>' + zip + '</i>' : ''}</span></a></li>`).join('') + '</ul>';
  }
  fetch(P + 'assets/wall.json').then(r => r.json()).then(d => { data = d; render(); });
  const b = document.getElementById('shuffle'); if (b) b.addEventListener('click', () => data && render());
})();
