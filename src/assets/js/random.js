// Pick a random published ArtCard other than the one being viewed.
(function () {
  "use strict";
  var link = document.querySelector("[data-random]");
  if (!link) return;
  var prefix = link.dataset.prefix || "/";
  var current = link.dataset.current || "";
  var slugs = null;

  function pick() {
    if (!slugs || !slugs.length) return null;
    var others = slugs.filter(function (s) { return s !== current; });
    if (!others.length) return null;
    return prefix + "art/" + others[Math.floor(Math.random() * others.length)] + "/";
  }

  function go(e) {
    var url = pick();
    if (!url) return;
    if (e) e.preventDefault();
    location.href = url;
  }

  link.addEventListener("click", go);

  fetch(prefix + "assets/slugs.json")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (Array.isArray(d) && d.length) slugs = d; })
    .catch(function () {});
})();
