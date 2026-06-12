/* ==========================================================================
   weldline.js — scroll-driven weld seam divider
   A refined TIG seam: thin metallic bead with stack-of-dimes ripples and
   subtle heat tint. The arc point chases the scroll target with easing,
   so it sweeps fast and smooth. Scroll back up and the seam rewinds.
   ========================================================================== */

(function () {
  "use strict";

  function WeldLine(el) {
    this.el = el;
    this.canvas = el.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.target = 0;     // where the scroll wants the torch
    this.current = 0;    // where the torch actually is (eased)
    this.sparkAccum = 0;
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

  WeldLine.prototype.setTarget = function (p) {
    this.target = Math.max(0, Math.min(1, p));
  };

  WeldLine.prototype.spawn = function (x, y) {
    var n = 1 + Math.floor(Math.random() * 2);
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      var s = 0.8 + Math.random() * 1.9;
      this.sparks.push({
        x: x, y: y,
        vx: Math.cos(a) * s + 0.35,
        vy: Math.sin(a) * s,
        l: 1,
        d: 0.035 + Math.random() * 0.045
      });
    }
  };

  WeldLine.prototype.drawBead = function (tx) {
    var c = this.ctx, y = this.h / 2;

    // permanent faint heat tint along the seam (gold close, blue further)
    var tintEnd = Math.max(0, tx - 4);
    if (tintEnd > 2) {
      c.fillStyle = "rgba(255, 170, 80, 0.05)";
      c.fillRect(0, y - 6.5, tintEnd, 13);
      c.fillStyle = "rgba(110, 150, 235, 0.035)";
      c.fillRect(0, y - 10, tintEnd, 3);
      c.fillRect(0, y + 7, tintEnd, 3);
    }

    // bead body: slim metallic capsule
    var g = c.createLinearGradient(0, y - 3.5, 0, y + 3.5);
    g.addColorStop(0, "rgba(140, 144, 150, 0.50)");
    g.addColorStop(0.32, "rgba(226, 229, 234, 0.72)");
    g.addColorStop(0.66, "rgba(118, 122, 128, 0.55)");
    g.addColorStop(1, "rgba(58, 60, 64, 0.50)");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, y - 3.5);
    c.lineTo(Math.max(0, tx - 3.5), y - 3.5);
    c.arc(Math.max(0, tx - 3.5), y, 3.5, -Math.PI / 2, Math.PI / 2);
    c.lineTo(0, y + 3.5);
    c.closePath();
    c.fill();

    // stack-of-dimes ripples: fine crescents leaning back from the torch
    c.strokeStyle = "rgba(38, 40, 44, 0.45)";
    c.lineWidth = 1;
    for (var x = 3; x < tx - 6; x += 4.2) {
      c.beginPath();
      c.arc(x, y, 3, -1.08, 1.08);
      c.stroke();
    }

    // crisp top highlight: polished crown of the bead
    c.strokeStyle = "rgba(255, 255, 255, 0.26)";
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(1, y - 2.1);
    c.lineTo(Math.max(1, tx - 4), y - 2.1);
    c.stroke();

    // fresh weld: warm fade on the last stretch behind the arc
    var hot = Math.min(90, tx);
    if (hot > 4) {
      var hg = c.createLinearGradient(tx - hot, 0, tx, 0);
      hg.addColorStop(0, "rgba(255, 150, 60, 0)");
      hg.addColorStop(1, "rgba(255, 165, 75, 0.32)");
      c.fillStyle = hg;
      c.fillRect(tx - hot, y - 3.5, hot, 7);
    }
  };

  WeldLine.prototype.tick = function () {
    if (!this.active) return;
    var c = this.ctx, w = this.w, h = this.h;
    var y = h / 2;

    // chase the scroll target: fast, smooth, settles cleanly
    var prev = this.current;
    this.current += (this.target - this.current) * 0.16;
    if (Math.abs(this.target - this.current) < 0.0005) this.current = this.target;
    var tx = this.current * w;

    // sparks only while welding forward
    var dx = (this.current - prev) * w;
    if (dx > 0) {
      this.sparkAccum += dx;
      while (this.sparkAccum > 10) {
        this.spawn(tx - Math.random() * Math.min(dx, 26), y);
        this.sparkAccum -= 10;
      }
    } else {
      this.sparkAccum = 0;
    }

    c.clearRect(0, 0, w, h);

    // open joint ahead: a fine machined groove
    c.strokeStyle = "rgba(10, 10, 12, 0.8)";
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(tx, y); c.lineTo(w, y); c.stroke();
    c.strokeStyle = "rgba(190, 194, 200, 0.16)";
    c.beginPath(); c.moveTo(tx, y + 1); c.lineTo(w, y + 1); c.stroke();

    if (tx > 1) this.drawBead(tx);

    // TIG arc: small, white-blue, intense
    if (tx > 0.5 && Math.abs(this.target - this.current) > 0.0004) {
      var ag = c.createRadialGradient(tx, y, 0, tx, y, 10);
      ag.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      ag.addColorStop(0.22, "rgba(208, 228, 255, 0.75)");
      ag.addColorStop(0.55, "rgba(255, 195, 115, 0.28)");
      ag.addColorStop(1, "rgba(255, 140, 50, 0)");
      c.fillStyle = ag;
      c.beginPath();
      c.arc(tx, y, 10, 0, Math.PI * 2);
      c.fill();
    }

    // fine sparks
    for (var i = this.sparks.length - 1; i >= 0; i--) {
      var p = this.sparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.09;
      p.l -= p.d;
      if (p.l <= 0 || p.y > h + 8) { this.sparks.splice(i, 1); continue; }
      c.strokeStyle = "rgba(255, " + (175 + Math.round(70 * p.l)) + ", 90, " + (p.l * 0.9) + ")";
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(p.x - p.vx * 1.8, p.y - p.vy * 1.8);
      c.lineTo(p.x, p.y);
      c.stroke();
    }

    requestAnimationFrame(this.tick);
  };

  window.WeldLine = WeldLine;
})();
