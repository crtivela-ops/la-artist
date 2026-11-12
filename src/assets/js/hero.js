// Featured ArtCard slideshow. No libraries.
// Instant slide changes (no fade or motion). Auto-advance every 3.5s
// unless the visitor prefers reduced motion.
(function () {
  "use strict";
  var root = document.querySelector("[data-hero]");
  if (!root) return;

  var INTERVAL = 3500;
  var VISIT_COUNT = 12;
  var STORAGE_KEY = "artcard.hero.lastIds";
  var RECENT_MAX = 4;

  var stage = root.querySelector(".hero-stage");
  var bar = root.querySelector(".hero-bar");
  var slides = [].slice.call(root.querySelectorAll("[data-hero-slide]"));
  var dots = [].slice.call(root.querySelectorAll("[data-hero-dot]"));
  var caps = [].slice.call(root.querySelectorAll("[data-hero-slide-cap]"));
  var prev = root.querySelector("[data-hero-prev]");
  var next = root.querySelector("[data-hero-next]");
  var prefix = root.getAttribute("data-prefix") || "/";

  function withPrefix(path) {
    if (!path) return path;
    if (/^https?:/i.test(path)) return path;
    var p = prefix;
    if (!p.endsWith("/")) p += "/";
    return p + String(path).replace(/^\//, "");
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function readRecent() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }

  function writeRecent(id) {
    try {
      var recent = readRecent().filter(function (x) { return x !== id; });
      recent.push(id);
      if (recent.length > RECENT_MAX) recent = recent.slice(recent.length - RECENT_MAX);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch (e) { /* private mode */ }
  }

  function readPool() {
    var el = root.querySelector("[data-hero-pool]");
    if (!el) return [];
    try {
      var data = JSON.parse(el.textContent);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function pickPlaylist(pool) {
    if (!pool.length) return [];
    var recent = readRecent();
    var startPool = pool.filter(function (c) { return recent.indexOf(c.id) < 0; });
    if (!startPool.length) startPool = pool.slice();
    var first = startPool[Math.floor(Math.random() * startPool.length)];
    var rest = shuffle(pool.filter(function (c) { return c.id !== first.id; }));
    var n = Math.min(VISIT_COUNT, pool.length);
    var list = [first].concat(rest.slice(0, Math.max(0, n - 1)));
    writeRecent(first.id);
    return list;
  }

  function fillCaption(el, card) {
    el.textContent = "";
    var a1 = document.createElement("a");
    a1.href = withPrefix("/art/" + card.slug + "/");
    a1.textContent = "ArtCard by " + card.artist;
    el.appendChild(a1);
    if (card.hood && card.hoodSlug) {
      var i = document.createElement("i");
      i.appendChild(document.createTextNode(" · "));
      var a2 = document.createElement("a");
      a2.href = withPrefix("/neighborhood/" + card.hoodSlug + "/");
      a2.textContent = card.hood;
      i.appendChild(a2);
      el.appendChild(i);
    } else if (card.zips && card.zips.length) {
      var iz = document.createElement("i");
      iz.textContent = " · ZIP " + card.zips.join(", ");
      el.appendChild(iz);
    }
  }

  function fillSlide(slide, cap, dot, card, isFirst) {
    slide.href = withPrefix("/art/" + card.slug + "/");
    var img = slide.querySelector("img");
    var src = withPrefix("/assets/art/" + card.id + ".webp");
    var src400 = withPrefix("/assets/art/" + card.id + "-400.webp");
    img.alt = "ArtCard by " + card.artist;
    img.setAttribute("width", String(card.w));
    img.setAttribute("height", String(card.h));
    img.width = card.w;
    img.height = card.h;
    img.sizes = "(max-width: 1200px) calc(100vw - 32px), 1168px";
    img.srcset = src400 + " 400w, " + src + " " + card.w + "w";
    img.setAttribute("data-hero-id", String(card.id));
    if (isFirst) {
      img.setAttribute("fetchpriority", "high");
      img.fetchPriority = "high";
      img.removeAttribute("loading");
      img.decoding = "async";
    } else {
      img.removeAttribute("fetchpriority");
      img.loading = "lazy";
      img.decoding = "async";
    }
    img.src = src;
    if (cap) fillCaption(cap, card);
    if (dot) dot.setAttribute("aria-label", "ArtCard by " + card.artist);
  }

  // Apply a random visit playlist from the curated pool, if present.
  // The server-rendered first slide stays as the no-JS fallback.
  var pool = readPool();
  if (pool.length) {
    var playlist = pickPlaylist(pool);
    var needed = playlist.length;
    // Reuse existing slide/caption/dot nodes; clone if the visit set is longer.
    var tmplSlide = slides[0];
    var tmplCap = caps[0];
    var dotsWrap = root.querySelector(".hero-dots");
    while (slides.length < needed) {
      var s = tmplSlide.cloneNode(true);
      s.classList.remove("is-active");
      s.setAttribute("hidden", "");
      s.setAttribute("aria-hidden", "true");
      stage.insertBefore(s, prev || null);
      slides.push(s);
      if (tmplCap && bar) {
        var c = tmplCap.cloneNode(true);
        c.setAttribute("hidden", "");
        if (dotsWrap) bar.insertBefore(c, dotsWrap);
        else bar.appendChild(c);
        caps.push(c);
      }
      if (dotsWrap) {
        var d = document.createElement("button");
        d.type = "button";
        d.setAttribute("data-hero-dot", "");
        d.setAttribute("role", "tab");
        dotsWrap.appendChild(d);
        dots.push(d);
      }
    }
    // Hide leftover SSR slides if the playlist is shorter (shouldn't happen at 12).
    for (var extra = needed; extra < slides.length; extra++) {
      slides[extra].setAttribute("hidden", "");
      slides[extra].setAttribute("aria-hidden", "true");
      slides[extra].classList.remove("is-active");
      if (caps[extra]) caps[extra].setAttribute("hidden", "");
      if (dots[extra]) dots[extra].hidden = true;
    }
    slides = slides.slice(0, needed);
    caps = caps.slice(0, needed);
    dots = dots.slice(0, needed);
    playlist.forEach(function (card, idx) {
      fillSlide(slides[idx], caps[idx], dots[idx], card, idx === 0);
    });
  }

  if (slides.length < 2) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var i = 0;
  var timer = null;
  var paused = false;

  function show(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) {
      var on = k === i;
      s.classList.toggle("is-active", on);
      if (on) s.removeAttribute("hidden");
      else s.setAttribute("hidden", "");
      s.setAttribute("aria-hidden", on ? "false" : "true");
    });
    dots.forEach(function (d, k) {
      var on = k === i;
      d.classList.toggle("is-active", on);
      if (on) d.setAttribute("aria-current", "true");
      else d.removeAttribute("aria-current");
    });
    caps.forEach(function (c, k) {
      if (k === i) c.removeAttribute("hidden");
      else c.setAttribute("hidden", "");
    });
  }

  function play() {
    if (reduce || paused || document.hidden) return;
    stop();
    // Full dwell from this moment — also used after a manual prev/next/swipe.
    timer = setInterval(function () { show(i + 1); }, INTERVAL);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  function pause() { paused = true; stop(); }
  function resume() { paused = false; play(); }
  function manual(n) {
    show(n);
    if (!paused) play();
  }

  if (prev) {
    prev.hidden = false;
    prev.addEventListener("click", function () { manual(i - 1); });
  }
  if (next) {
    next.hidden = false;
    next.addEventListener("click", function () { manual(i + 1); });
  }
  dots.forEach(function (d, k) {
    d.addEventListener("click", function () { manual(k); });
  });

  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); manual(i - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); manual(i + 1); }
    else if (e.key === "Home") { e.preventDefault(); manual(0); }
    else if (e.key === "End") { e.preventDefault(); manual(slides.length - 1); }
  });

  root.addEventListener("mouseenter", pause);
  root.addEventListener("mouseleave", resume);
  root.addEventListener("focusin", pause);
  root.addEventListener("focusout", function (e) {
    if (!root.contains(e.relatedTarget)) resume();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (!paused) play();
  });

  // Swipe (horizontal only). A completed swipe also resets the dwell timer.
  var startX = 0, startY = 0, tracking = false;
  root.addEventListener("touchstart", function (e) {
    if (!e.changedTouches[0]) return;
    startX = e.changedTouches[0].clientX;
    startY = e.changedTouches[0].clientY;
    tracking = true;
    pause();
  }, { passive: true });
  root.addEventListener("touchend", function (e) {
    if (!tracking || !e.changedTouches[0]) return;
    tracking = false;
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(i + (dx < 0 ? 1 : -1));
    resume();
  }, { passive: true });
  root.addEventListener("touchcancel", function () { tracking = false; resume(); }, { passive: true });

  root.classList.add("is-ready");
  show(0);
  play();
})();
