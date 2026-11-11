// Featured ArtCard slideshow. No libraries.
(function () {
  "use strict";
  var root = document.querySelector("[data-hero]");
  if (!root) return;

  var slides = [].slice.call(root.querySelectorAll("[data-hero-slide]"));
  var dots = [].slice.call(root.querySelectorAll("[data-hero-dot]"));
  var caps = [].slice.call(root.querySelectorAll("[data-hero-slide-cap]"));
  var prev = root.querySelector("[data-hero-prev]");
  var next = root.querySelector("[data-hero-next]");
  if (slides.length < 2) return;

  var INTERVAL = 5000;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var i = slides.findIndex(function (s) { return s.classList.contains("is-active"); });
  if (i < 0) i = 0;
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
    timer = setInterval(function () { show(i + 1); }, INTERVAL);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  function pause() { paused = true; stop(); }
  function resume() { paused = false; play(); }

  if (prev) {
    prev.hidden = false;
    prev.addEventListener("click", function () { show(i - 1); if (!paused) play(); });
  }
  if (next) {
    next.hidden = false;
    next.addEventListener("click", function () { show(i + 1); if (!paused) play(); });
  }
  dots.forEach(function (d, k) {
    d.addEventListener("click", function () { show(k); if (!paused) play(); });
  });

  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); show(i - 1); if (!paused) play(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); show(i + 1); if (!paused) play(); }
    else if (e.key === "Home") { e.preventDefault(); show(0); if (!paused) play(); }
    else if (e.key === "End") { e.preventDefault(); show(slides.length - 1); if (!paused) play(); }
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

  // Swipe (horizontal only)
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
  show(i);
  play();
})();
