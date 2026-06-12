/* ==========================================================================
   weldline.js — scroll-driven weld seam divider
   Two steel plates butt-jointed; as the divider crosses the viewport, a
   torch point travels the seam, laying a rippled bead and throwing sparks.
   Progress (0..1) is fed from outside (ScrollTrigger scrub in main.js).
   ========================================================================== */

(function () {
  "use strict";

  function WeldLine(el) {
    this.el = el;
    this.canvas = el.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.progress = 0;
    this.lastSparkX = -1;
    this.sparks = [];
    this.active = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();
    el.classList.add("is-live");

    var self = this;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var was = self.active;
          self.active = en.isIntersecting;
          if (self.active && !was) requestAnimationFrame(self.tick);
        });
      }, { threshold: 0 }).observe(el);
    } else {
      this.active = true;
      requestAnimationFrame(this.tick);
    }
  }

  WeldLine.prototype.resize = function () {
    var r = this.el.getBoundingClientRect();
    this.w = Math.max(r.width, 1);
    this.h = Math.max(r.height, 1);
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  WeldLine.prototype.setProgress = function (p) {
    this.progress = Math.max(0, Math.min(1, p));
    var x = this.progress * this.w;
    if (x - this.lastSparkX > 7) {
      this.spawn(x);
      this.lastSparkX = x;
    } else if (x < this.lastSparkX) {
      this.lastSparkX = x; // scrolling back up: rewind, no sparks
    }
  };

  WeldLine.prototype.spawn = function (x) {
    var y = this.h / 2;
    var n = 2 + Math.floor(Math.random() * 4);
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
      var s = 1.4 + Math.random() * 3.4;
      this.sparks.push({
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        l: 1,
        d: 0.018 + Math.random() * 0.04
      });
    }
  };

  WeldLine.prototype.tick = function () {
    if (!this.active) return;
    var c = this.ctx, w = this.w, h = this.h;
    var y = h / 2;
    var tx = this.progress * w;
    c.clearRect(0, 0, w, h);

    // open joint, waiting for the torch
    c.save();
    c.setLineDash([5, 7]);
    c.strokeStyle = "rgba(139, 143, 150, 0.38)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(tx, y);
    c.lineTo(w, y);
    c.stroke();
    c.restore();

    if (tx > 1) {
      // residual heat behind the torch
      var trail = Math.min(150, tx);
      var g = c.createLinearGradient(tx - trail, 0, tx, 0);
      g.addColorStop(0, "rgba(255, 122, 26, 0)");
      g.addColorStop(1, "rgba(255, 122, 26, 0.45)");
      c.strokeStyle = g;
      c.lineWidth = 7;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(tx - trail, y);
      c.lineTo(tx, y);
      c.stroke();

      // laid bead: cooled core + ripple scallops
      c.strokeStyle = "rgba(255, 179, 71, 0.30)";
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(tx, y);
      c.stroke();
      c.strokeStyle = "rgba(210, 213, 218, 0.5)";
      c.lineWidth = 1;
      for (var x = 4; x < tx - 6; x += 6) {
        c.beginPath();
        c.arc(x, y, 3, Math.PI * 0.15, Math.PI * 0.85, false);
        c.stroke();
      }

      // torch point: white-hot core
      var tg = c.createRadialGradient(tx, y, 0, tx, y, 17);
      tg.addColorStop(0, "rgba(255, 252, 240, 0.95)");
      tg.addColorStop(0.25, "rgba(255, 205, 125, 0.75)");
      tg.addColorStop(1, "rgba(255, 122, 26, 0)");
      c.fillStyle = tg;
      c.beginPath();
      c.arc(tx, y, 17, 0, Math.PI * 2);
      c.fill();
    }

    // flying sparks
    for (var i = this.sparks.length - 1; i >= 0; i--) {
      var p = this.sparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.l -= p.d;
      if (p.l <= 0 || p.y > h + 10) { this.sparks.splice(i, 1); continue; }
      c.strokeStyle = "rgba(255, " + (160 + Math.round(80 * p.l)) + ", 60, " + p.l + ")";
      c.lineWidth = 1.1;
      c.beginPath();
      c.moveTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
      c.lineTo(p.x, p.y);
      c.stroke();
    }

    requestAnimationFrame(this.tick);
  };

  window.WeldLine = WeldLine;
})();
