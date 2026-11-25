"use strict";
(() => {
  const editorial = document.querySelector(".editorial");
  const frame = document.querySelector(".photo-frame");
  const sources = [...new Set([...document.querySelectorAll(".model-figure image")].map(image => image.getAttribute("href")))];
  if (!editorial || !frame || !sources.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let ready = false, inView = true, pageActive = true;

  function syncPlayback() {
    const overlayOpen = !!document.querySelector("dialog[open]");
    const running = ready && inView && pageActive && !document.hidden && !overlayOpen && !reducedMotion.matches;
    editorial.classList.toggle("is-static", reducedMotion.matches);
    editorial.classList.toggle("is-running", running);
    editorial.dataset.motion = reducedMotion.matches ? "reduced" : !ready ? "loading" : running ? "playing" : "paused";
  }

  // Each cutout glides in from the left at a distance, holds in the spotlight,
  // then moves forward and out to the right. Six-second slots keep them separate.
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncPlayback();
  }, { threshold: .1 }).observe(frame);
  document.addEventListener("visibilitychange", syncPlayback);
  document.addEventListener("wardrobewish:overlay-change", syncPlayback);
  reducedMotion.addEventListener("change", syncPlayback);
  window.addEventListener("pagehide", () => { pageActive = false; syncPlayback(); });
  window.addEventListener("pageshow", () => { pageActive = true; syncPlayback(); });

  syncPlayback();
  Promise.all(sources.map(source => {
    const image = new Image();
    image.src = source;
    return image.decode();
  })).then(() => {
    ready = true;
    editorial.classList.add("models-ready");
    syncPlayback();
  }).catch(() => {
    // Leave the first model still if an asset cannot be decoded.
    editorial.dataset.motion = "unavailable";
  });
})();
