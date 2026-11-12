// Share + Copy link for ArtCard.LA. No third-party scripts, no tracking.
// Share only the page title, a short text caption, and the page URL — never a file
// or image URL, so iOS Messages shows a link preview without a second attachment.
(function () {
  "use strict";
  function init(box) {
    var url = box.dataset.url, title = box.dataset.title, text = box.dataset.text;
    var shareBtn = box.querySelector("[data-share-native]");
    var copyBtn = box.querySelector("[data-share-copy]");
    var status = box.querySelector("[data-share-status]");
    var field = box.querySelector("[data-share-field]");
    var timer;

    function say(msg) {
      if (!status) return;
      status.textContent = msg;
      clearTimeout(timer);
      timer = setTimeout(function () { status.textContent = ""; }, 2500);
    }

    function shareNative() {
      navigator.share({ title: title, text: text, url: url }).catch(function (err) {
        if (err && err.name === "AbortError") return;
      });
    }

    function fallback() {
      if (!field) return;
      field.hidden = false;
      field.focus();
      field.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      say(ok ? "Copied" : "Press Ctrl+C or \u2318C to copy");
    }

    function copyLink() {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(function () { if (field) field.hidden = true; say("Copied"); }, fallback);
      } else {
        fallback();
      }
    }

    function doShare() {
      if (navigator.share) shareNative();
      else copyLink();
    }

    if (navigator.share && shareBtn) {
      shareBtn.hidden = false;
      shareBtn.addEventListener("click", shareNative);
    }

    if (copyBtn) copyBtn.addEventListener("click", copyLink);

    var root = box.closest("article") || box.parentElement || document;
    var triggers = root.querySelectorAll("[data-share-trigger]");
    for (var t = 0; t < triggers.length; t++) triggers[t].addEventListener("click", doShare);

    box.hidden = false;
  }
  var boxes = document.querySelectorAll("[data-share]");
  for (var i = 0; i < boxes.length; i++) init(boxes[i]);
})();
