/* ==========================================================================
   main.js — Lucien Candaux
   Lenis smooth scroll + GSAP ScrollTrigger scroll frames + spark effects
   ========================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (REDUCED) document.documentElement.classList.add("reduced");

  /* ---------------- Loader ---------------- */
  var loader = document.getElementById("loader");
  function dismissLoader() {
    if (loader && !loader.classList.contains("is-done")) {
      loader.classList.add("is-done");
    }
  }
  window.addEventListener("load", function () { setTimeout(dismissLoader, 1400); });
  setTimeout(dismissLoader, 4200); // never block the site

  /* ---------------- Lenis smooth scroll ---------------- */
  var lenis = null;
  if (window.Lenis && !REDUCED) {
    lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.95 });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  /* ---------------- Header state + anchors ---------------- */
  var header = document.getElementById("header");
  function onScrollHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  function scrollToTarget(hash) {
    var el = document.querySelector(hash);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 });
    else el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var hash = a.getAttribute("href");
      if (hash.length > 1) {
        e.preventDefault();
        closeMenu();
        scrollToTarget(hash);
      }
    });
  });

  /* ---------------- Mobile menu ---------------- */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobilemenu");
  function closeMenu() {
    menu.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
  }
  burger.addEventListener("click", function () {
    var open = menu.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
  });

  /* ---------------- Spark fields ---------------- */
  var heroCanvas = document.getElementById("sparks-hero");
  if (heroCanvas && window.SparkField) {
    var heroSparks = new SparkField(heroCanvas, { mode: "embers" });
    heroSparks.start();
    // pause when hero off-screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) heroSparks.start(); else heroSparks.stop();
        });
      }, { threshold: 0.05 }).observe(heroCanvas);
    }
  }

  // CTA grinder burst
  var btn = document.getElementById("btn-devis");
  if (btn && window.SparkField) {
    var btnCanvas = btn.querySelector(".btn-forge__sparks");
    var btnSparks = new SparkField(btnCanvas, { mode: "burst" });
    var burstTimer = null;
    btn.addEventListener("mouseenter", function () {
      btnSparks.resize();
      btnSparks.start();
      var rect = btnCanvas.getBoundingClientRect();
      function burst() {
        btnSparks.spawnBurst(rect.width / 2, rect.height / 2 + 10, 22);
      }
      burst();
      burstTimer = setInterval(burst, 320);
    });
    btn.addEventListener("mouseleave", function () {
      clearInterval(burstTimer);
      setTimeout(function () { btnSparks.stop(); }, 900);
    });
  }

  /* ---------------- GSAP scroll frames ----------------
     Runs under reduced motion too: every effect below is scroll-coupled
     (scrub) or a one-shot reveal; autonomous particles stay gated. */
  if (!window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);
  if (lenis) lenis.on("scroll", ScrollTrigger.update);

  // Hero: content drifts up + fades as you leave the frame
  gsap.to(".hero__content", {
    yPercent: -28,
    opacity: 0,
    ease: "none",
    scrollTrigger: {
      trigger: "#hero",
      start: "top top",
      end: "bottom 30%",
      scrub: true
    }
  });

  // Manifeste: parallax steel texture + word-by-word ignition
  gsap.to(".manifeste__bg", {
    yPercent: 14,
    ease: "none",
    scrollTrigger: { trigger: "#manifeste", start: "top bottom", end: "bottom top", scrub: true }
  });

  var statement = document.getElementById("statement");
  if (statement) {
    var words = statement.textContent.trim().split(/\s+/);
    statement.innerHTML = words
      .map(function (w) { return '<span class="w">' + w + "</span>"; })
      .join(" ");
    gsap.to("#statement .w", {
      opacity: 1,
      stagger: 0.06,
      ease: "none",
      scrollTrigger: {
        trigger: "#manifeste",
        start: "top 62%",
        end: "center 42%",
        scrub: true
      }
    });
  }

  // Generic reveals
  document.querySelectorAll("[data-reveal]").forEach(function (el) {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1.3,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 84%", once: true }
    });
  });

  // Horizontal gallery
  var track = document.getElementById("gallery-track");
  var pin = document.getElementById("gallery-pin");
  if (track && pin) {
    function distance() {
      return Math.max(0, track.scrollWidth - window.innerWidth);
    }
    gsap.to(track, {
      x: function () { return -distance(); },
      ease: "none",
      scrollTrigger: {
        trigger: "#realisations",
        start: "top top",
        end: function () { return "+=" + (distance() + window.innerHeight * 0.25); },
        pin: pin,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });
  }

  // Weld seam dividers are self-driving (see weldline.js auto-init)

  // Atelier portrait slight parallax
  gsap.fromTo(".atelier__portrait", { y: 50 }, {
    y: -50,
    ease: "none",
    scrollTrigger: { trigger: "#atelier", start: "top bottom", end: "bottom top", scrub: true }
  });

  // Refresh once media is in
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
