/* ==========================================================================
   sparks.js — canvas ember / spark particle engine
   Two modes:
     - "embers": slow glowing particles drifting upward (hero ambiance)
     - "burst":  directional grinder-style spark fans (CTA hover)
   ========================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rand(min, max) { return min + Math.random() * (max - min); }

  /* ------------------------------------------------------------------ */
  function SparkField(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.opts = opts || {};
    this.mode = this.opts.mode || "embers";
    this.particles = [];
    this.running = false;
    this.burstQueue = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  SparkField.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(rect.width, 1);
    this.h = Math.max(rect.height, 1);
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  SparkField.prototype.spawnEmber = function () {
    this.particles.push({
      x: rand(0, this.w),
      y: rand(this.h * 0.55, this.h + 20),
      vx: rand(-0.18, 0.18),
      vy: rand(-0.55, -0.18),
      size: rand(0.6, 2.1),
      life: 1,
      decay: rand(0.0015, 0.004),
      hot: Math.random() < 0.25,
      wobble: rand(0, Math.PI * 2),
      wobbleSpeed: rand(0.005, 0.02)
    });
  };

  SparkField.prototype.spawnBurst = function (x, y, count) {
    for (var i = 0; i < count; i++) {
      var angle = rand(-Math.PI * 0.95, -Math.PI * 0.05); // upward fan
      var speed = rand(2.2, 7.5);
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(0.5, 1.6),
        life: 1,
        decay: rand(0.015, 0.045),
        hot: true,
        gravity: 0.16,
        trail: true
      });
    }
  };

  SparkField.prototype.tick = function () {
    if (!this.running) return;
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    if (this.mode === "embers") {
      var target = this.opts.density || Math.min(70, (this.w * this.h) / 26000);
      if (this.particles.length < target && Math.random() < 0.5) this.spawnEmber();
    }

    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];

      if (p.wobble !== undefined) {
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 0.22;
      } else {
        p.x += p.vx;
      }
      if (p.gravity) p.vy += p.gravity;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0 || p.y < -30 || p.y > this.h + 40 || p.x < -40 || p.x > this.w + 40) {
        this.particles.splice(i, 1);
        continue;
      }

      var alpha = Math.max(0, Math.min(1, p.life));
      var r = p.size * (p.trail ? 1 : 0.6 + alpha * 0.8);

      if (p.trail) {
        ctx.strokeStyle = "rgba(255, " + Math.round(150 + 90 * alpha) + ", 40, " + alpha + ")";
        ctx.lineWidth = r;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        var glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        if (p.hot) {
          glow.addColorStop(0, "rgba(255, 214, 140, " + alpha + ")");
          glow.addColorStop(0.4, "rgba(255, 122, 26, " + alpha * 0.55 + ")");
        } else {
          glow.addColorStop(0, "rgba(255, 160, 70, " + alpha * 0.8 + ")");
          glow.addColorStop(0.4, "rgba(214, 90, 20, " + alpha * 0.4 + ")");
        }
        glow.addColorStop(1, "rgba(120, 40, 0, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(this.tick);
  };

  SparkField.prototype.start = function () {
    if (REDUCED || this.running) return;
    this.running = true;
    requestAnimationFrame(this.tick);
  };

  SparkField.prototype.stop = function () {
    this.running = false;
    this.particles.length = 0;
    this.ctx.clearRect(0, 0, this.w, this.h);
  };

  window.SparkField = SparkField;
})();
