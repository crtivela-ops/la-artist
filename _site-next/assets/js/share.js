// Share + Copy link for ArtCard.LA. No third-party scripts, no tracking.
(function () {
  "use strict";
  function init(box) {
    var url = box.dataset.url, title = box.dataset.title, text = box.dataset.text, fileSrc = box.dataset.file;
    var shareBtn = box.querySelector("[data-share-native]");
    var copyBtn = box.querySelector("[data-share-copy]");
    var status = box.querySelector("[data-share-status]");
    var field = box.querySelector("[data-share-field]");
    var timer, file = null;

    function say(msg) {
      status.textContent = msg;
      clearTimeout(timer);
      timer = setTimeout(function () { status.textContent = ""; }, 2500);
    }

    // Prepare the artwork as a File ahead of time so the share sheet opens
    // within the click's user activation (iOS Safari is strict about this).
    function prepareFile() {
      if (!fileSrc || !window.fetch || !window.File || !navigator.canShare) return;
      fetch(fileSrc).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) {
        if (!b) return;
        var name = (title || "artcard").replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "").toLowerCase() + ".webp";
        var f = new File([b], name, { type: b.type || "image/webp" });
        try { if (navigator.canShare({ files: [f] })) file = f; } catch (e) {}
      }).catch(function () {});
    }

    if (navigator.share) {
      shareBtn.hidden = false;
      prepareFile();
      shareBtn.addEventListener("click", function () {
        var data = { title: title, text: text, url: url };
        if (file) {
          var withFile = { title: title, text: text, url: url, files: [file] };
          try { if (navigator.canShare(withFile)) data = withFile; } catch (e) {}
        }
        navigator.share(data).catch(function (err) {
          if (err && err.name === "AbortError") return;
          if (data.files) navigator.share({ title: title, text: text, url: url }).catch(function () {});
        });
      });
    }

    function fallback() {
      field.hidden = false;
      field.focus();
      field.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      say(ok ? "Copied" : "Press Ctrl+C or \u2318C to copy");
    }

    copyBtn.addEventListener("click", function () {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(function () { field.hidden = true; say("Copied"); }, fallback);
      } else {
        fallback();
      }
    });

    box.hidden = false;
  }
  var boxes = document.querySelectorAll("[data-share]");
  for (var i = 0; i < boxes.length; i++) init(boxes[i]);
})();
