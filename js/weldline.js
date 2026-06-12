/* ==========================================================================
   weldline.js — scroll-driven weld seam divider
   Reference look: stainless TIG seam — a delicate bead built from
   overlapping molten puddles, so its edges scallop naturally (no straight
   borders), with faint gold/blue heat tint. The arc chases the scroll
   target with easing and throws visible sparks while it welds.
   ========================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function WeldLine(el) {
    this.reduced = REDUCED;
    this.el = el;
    this.canvas = el.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.target = 0;
    this.current = 0;
    this.sparkAccum = 0;
    this.idleSparkT = 0;
    this.sparks = [];
    this.active = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    window.addEventListener("resize", this.resize);
    this.makeStamp();
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

  // one molten puddle, pre-rendered: light crown, darker trailing crescent
  WeldLine.prototype.makeStamp = function () {
    var D = 4;                       // logical puddle diameter (slim seam)
    var res = 8;                     // oversampled for crispness
    var s = document.createElement("canvas");
    s.width = s.height = D * res;
    var x = s.getContext("2d");
    var cx = (D * res) / 2, r = (D * res) / 2 - res * 0.2;
    var g = x.createRadialGradient(cx - r * 0.35, cx - r * 0.4, r * 0.1, cx, cx, r);
    g.addColorStop(0, "rgba(240, 243, 248, 0.95)");
    g.addColorStop(0.5, "rgba(168, 173, 180, 0.92)");
    g.addColorStop(0.82, "rgba(98, 102, 108, 0.9)");
    g.addColorStop(1, "rgba(55, 58, 63, 0.85)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cx, r, 0, Math.PI * 2);
    x.fill();
    // trailing crescent shadow on the right edge of each puddle
    x.strokeStyle = "rgba(30, 32, 36, 0.5)";
    x.lineWidth = res * 0.55;
    x.beginPath();
    x.arc(cx, cx, r * 0.82, -0.95, 0.95);
    x.stroke();
    this.stamp = s;
    this.stampD = D;
  };

  WeldLine.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    this.w = Math.max(r.width, 1);
    this.h = Math.max(r.height, 1);
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  WeldLine.prototype.setTarget = function (p) {
    this.target = Math.max(0, Math.min(1, p));
    this.external = true; // a scroll library is driving us
  };

  // self-driving fallback: progress from our own viewport position,
  // so the weld works even if no scroll library calls setTarget()
  WeldLine.prototype.updateTargetFromRect = function () {
    if (this.external) return;
    var vh = window.innerHeight || 1;
    var top = this.el.getBoundingClientRect().top;
    var raw = (vh * 0.85 - top) / (vh * 0.45);
    this.target = Math.max(0, Math.min(1, raw));
  };

  WeldLine.prototype.spawn = function (x, y, strength) {
    var n = 2 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      var s = (1.4 + Math.random() * 2.8) * (strength || 1);
      this.sparks.push({
        x: x, y: y,
        vx: Math.cos(a) * s + 0.4,
        vy: Math.sin(a) * s,
        l: 1,
        d: 0.02 + Math.random() * 0.035
      });
    }
  };

  WeldLine.prototype.drawBead = function (tx) {
    var c = this.ctx, y = this.h / 2;
    var D = this.stampD, half = D / 2;

    // faint heat tint hugging the seam: gold close, hint of blue beyond
    var tintEnd = Math.max(0, tx - 3);
    if (tintEnd > 2) {
      c.fillStyle = "rgba(255, 170, 80, 0.06)";
      c.fillRect(0, y - 3.5, tintEnd, 7);
      c.fillStyle = "rgba(110, 150, 235, 0.03)";
      c.fillRect(0, y - 5.5, tintEnd, 2);
      c.fillRect(0, y + 3.5, tintEnd, 2);
    }

    // the bead: overlapping puddles → scalloped edges, stack-of-dimes ripple
    for (var x = half; x < tx - half; x += 1.8) {
      c.drawImage(this.stamp, x - half, y - half, D, D);
    }

    // fresh stretch behind the arc still glows warm
    var hot = Math.min(70, tx);
    if (hot > 4) {
      var hg = c.createLinearGradient(tx - hot, 0, tx, 0);
      hg.addColorStop(0, "rgba(255, 150, 60, 0)");
      hg.addColorStop(1, "rgba(255, 170, 80, 0.4)");
      c.fillStyle = hg;
      c.fillRect(tx - hot, y - half, hot, D);
    }
  };

  WeldLine.prototype.tick = function () {
    if (!this.active) return;
    var c = this.ctx, w = this.w, h = this.h;
    var y = h / 2;

    this.updateTargetFromRect();
    var prev = this.current;
    this.current += (this.target - this.current) * 0.16;
    if (Math.abs(this.target - this.current) < 0.0005) this.current = this.target;
    var tx = this.current * w;
    var welding = this.current > 0.004 && this.current < 0.997;

    // sparks scale with welding speed; they only fly while the user
    // actively scrolls, so they run under reduced motion too. The idle
    // crackle is autonomous, so it stays gated.
    var dx = (this.current - prev) * w;
    if (dx > 0.05) {
      this.sparkAccum += dx;
      while (this.sparkAccum > 7) {
        // spread spawns along the distance swept this frame, not in clumps
        this.spawn(tx - Math.random() * dx, y, 1);
        this.sparkAccum -= 7;
      }
    } else if (welding && !this.reduced) {
      if (++this.idleSparkT > 14) {
        this.idleSparkT = 0;
        if (Math.random() < 0.7) this.spawn(tx, y, 0.55);
      }
    }

    c.clearRect(0, 0, w, h);

    // open joint ahead: fine machined groove
    c.strokeStyle = "rgba(10, 10, 12, 0.8)";
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(tx, y); c.lineTo(w, y); c.stroke();
    c.strokeStyle = "rgba(190, 194, 200, 0.16)";
    c.beginPath(); c.moveTo(tx, y + 1); c.lineTo(w, y + 1); c.stroke();

    if (tx > 1) this.drawBead(tx);

    // the arc: white-hot core, flickering halo — lit whenever mid-seam
    if (welding) {
      var fl = this.reduced ? 12 : 12 + Math.random() * 3.5;
      var ag = c.createRadialGradient(tx, y, 0, tx, y, fl);
      ag.addColorStop(0, "rgba(255, 255, 255, 1)");
      ag.addColorStop(0.18, "rgba(215, 232, 255, 0.85)");
      ag.addColorStop(0.45, "rgba(255, 200, 120, 0.4)");
      ag.addColorStop(1, "rgba(255, 140, 50, 0)");
      c.fillStyle = ag;
      c.beginPath();
      c.arc(tx, y, fl, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255, 255, 252, 0.95)";
      c.beginPath();
      c.arc(tx, y, 2.2, 0, Math.PI * 2);
      c.fill();
    }

    // sparks: bright, with real trails
    for (var i = this.sparks.length - 1; i >= 0; i--) {
      var p = this.sparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.085;
      p.l -= p.d;
      if (p.l <= 0 || p.y > h + 8) { this.sparks.splice(i, 1); continue; }
      c.strokeStyle = "rgba(255, " + (185 + Math.round(60 * p.l)) + ", 100, " + p.l + ")";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(p.x - p.vx * 2.6, p.y - p.vy * 2.6);
      c.lineTo(p.x, p.y);
      c.stroke();
    }

    requestAnimationFrame(this.tick);
  };

  window.WeldLine = WeldLine;

  // auto-init: each divider drives itself. Runs under reduced motion too —
  // the weld is scroll-coupled (only moves with the user's own scrolling);
  // autonomous sparks/flicker are disabled above instead.
  var boot = function () {
    document.querySelectorAll("[data-weldline]").forEach(function (el) {
      if (!el.weldline) el.weldline = new WeldLine(el);
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
