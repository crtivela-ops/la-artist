(function () {
  const el = document.getElementById('map'); if (!el || !window.L) return;
  const P = el.dataset.prefix || '/';
  const map = L.map(el, { scrollWheelZoom: false, tap: true }).setView([34.05, -118.25], 9);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · ZIPs: LA County eGIS'
  }).addTo(map);
  const steps = [1, 3, 6, 11, 26, 51];
  const colors = ['#f3e6f7', '#ddbfe8', '#c497d6', '#a66fb5', '#83479a', '#5b2470'];
  const color = (n) => { if (!n) return null; let c = colors[0]; steps.forEach((s, i) => { if (n >= s) c = colors[i]; }); return c; };
  Promise.all([fetch(P + 'assets/la_zips.geojson').then(r => r.json()), fetch(P + 'assets/zip-counts.json').then(r => r.json())])
    .then(([geo, counts]) => {
      const layer = L.geoJSON(geo, {
        style: f => { const n = counts[f.properties.ZIPCODE] || 0; return { color: n ? '#5b2470' : '#9a9a9a', weight: n ? 0.8 : 0.4, fillColor: color(n) || '#ffffff', fillOpacity: n ? 0.75 : 0.15 }; },
        onEachFeature: (f, l) => {
          const z = f.properties.ZIPCODE, n = counts[z] || 0;
          l.bindPopup(n ? `<b>ZIP ${z}</b><br>${n} ArtCard${n === 1 ? '' : 's'}<br><a href="${P}zip/${z}/">See the cards →</a>` : `<b>ZIP ${z}</b><br>No ArtCards yet`);
          l.on('mouseover', () => l.setStyle({ weight: 2.5 })); l.on('mouseout', () => layer.resetStyle(l));
        }
      }).addTo(map);
      const hit = L.featureGroup(); layer.eachLayer(l => { if (counts[l.feature.properties.ZIPCODE]) hit.addLayer(L.geoJSON(l.feature)); });
      map.fitBounds(hit.getBounds(), { padding: [12, 12] });
      const lg = document.getElementById('legend');
      if (lg) lg.innerHTML = steps.map((s, i) => `<span><i style="background:${colors[i]}"></i>${s}${steps[i + 1] ? '–' + (steps[i + 1] - 1) : '+'}</span>`).join('') + ' cards';
    });
})();
