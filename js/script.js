/* ============================================================
   JIHANA JALAL & OMER SHUROOK VADAKKAN — NIKHAH INVITATION
   Vanilla JS — gate intro, countdown, scroll reveals

   iOS FIXES in this version (search "iOS FIX"):
   1. Every <img> is forced to load eagerly and is decoded when the gate opens
   2. The gate (with its background copy, canvas, parallax) is REMOVED from the
      DOM after it opens, freeing image/GPU memory on iPhone
   3. Parallax layer is skipped on touch devices
   (The old commented-out guest / RSVP blocks were removed — they were unused.)
   ============================================================ */
(function () {
  "use strict";

  var gate = document.getElementById("gate");
  var gateButton = document.getElementById("gateButton");
  var invitation = document.getElementById("invitation");
  var scrollCue = document.getElementById("scrollCue");

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- iOS FIX: make sure every image really loads ---------- */
  function forceImagesToLoad() {
    var imgs = document.querySelectorAll("img");
    Array.prototype.forEach.call(imgs, function (img) {
      // lazy-loading inside hidden / transformed wrappers can fail on Safari
      img.loading = "eager";
      img.removeAttribute("loading");
      img.setAttribute("decoding", "async");

      // if the browser gave up on it, re-request it once
      if (img.complete && img.naturalWidth === 0 && img.src) {
        var src = img.src;
        img.src = "";
        img.src = src;
      }
      if (img.decode) {
        img.decode().catch(function () { /* ignore */ });
      }
    });
  }

  // run as soon as the page has loaded, and again when the gate opens
  window.addEventListener("load", forceImagesToLoad);

  /* ---------- Open the gate → curtain reveal (center → left & right) ---------- */
  var gateOpening = false;

  function openGate() {
    if (!gate || gateOpening) return;
    gateOpening = true;

    var DURATION = prefersReducedMotion ? 0 : 1600; // ms

    // Reveal the invitation underneath right away so it shows
    // through the opening as the curtain parts
    var revealAt = prefersReducedMotion ? 50 : 150;

    window.setTimeout(function () {
      invitation.classList.add("is-visible");
      invitation.setAttribute("aria-hidden", "false");
      document.body.classList.remove("locked");

      // iOS FIX: now that the invitation is visible, load/decode its images
      forceImagesToLoad();

      // move focus into the invitation for accessibility
      var hero = document.getElementById("hero");
      if (hero) hero.setAttribute("tabindex", "-1");
      if (hero) hero.focus({ preventScroll: true });
    }, revealAt);

    function finish() {
      gate.classList.add("is-open");
      gate.style.pointerEvents = "none";
      gate.style.visibility = "hidden";
      gate.setAttribute("aria-hidden", "true");

      // iOS FIX: remove the gate completely so Safari frees its background
      // image, canvas and blur layers (they are never needed again)
      window.setTimeout(function () {
        if (gate && gate.parentNode) gate.parentNode.removeChild(gate);
        forceImagesToLoad();
      }, 1100);
    }

    if (DURATION === 0) {
      finish();
      return;
    }

    // Block clicks on the gate while it animates
    gate.style.pointerEvents = "none";

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Applies a mask that hides a growing strip in the center,
    // so the gate is visible only on the far left and far right
    function applyMask(openPct) {
      var a = (50 - openPct).toFixed(2) + "%"; // left curtain edge
      var b = (50 + openPct).toFixed(2) + "%"; // right curtain edge
      var mask =
        "linear-gradient(to right, #000 0%, #000 " + a + ", transparent " + a +
        ", transparent " + b + ", #000 " + b + ", #000 100%)";
      gate.style.webkitMaskImage = mask;
      gate.style.maskImage = mask;
    }

    var startTime = null;

    function step(ts) {
      if (startTime === null) startTime = ts;
      var t = Math.min((ts - startTime) / DURATION, 1);
      var eased = easeInOutCubic(t);

      // 0% → 50.5% (slightly over 50 so nothing is left at the edges)
      applyMask(eased * 50.5);

      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        finish();
      }
    }

    applyMask(0);
    window.requestAnimationFrame(step);
  }

  if (gateButton) {
    document.body.classList.add("locked");
    gateButton.addEventListener("click", openGate);
    gateButton.addEventListener("keyup", function (e) {
      if (e.key === "Enter" || e.key === " ") openGate();
    });
  }

  if (scrollCue) {
    scrollCue.addEventListener("click", function () {
      var ayah = document.getElementById("ayah");
      if (ayah) ayah.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });

    // Safety net: never leave content invisible if the observer misfires
    window.setTimeout(function () {
      revealEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-visible");
      });
    }, 3000);
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Countdown timer ---------- */
  // Nikhah date: 7 November 2026, 11:00 AM
  // (written as numbers — iOS Safari can mis-parse some date strings)
  var WEDDING_DATE = new Date(2026, 10, 7, 11, 0, 0);

  var elDays = document.getElementById("cd-days");
  var elHours = document.getElementById("cd-hours");
  var elMins = document.getElementById("cd-mins");
  var elSecs = document.getElementById("cd-secs");

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function setCountdownNum(el, value) {
    if (!el || el.textContent === value) return;
    el.textContent = value;
    if (prefersReducedMotion) return;
    el.classList.remove("countdown__num--pulse");
    // force reflow so the animation can restart on rapid updates
    void el.offsetWidth;
    el.classList.add("countdown__num--pulse");
  }

  function tickCountdown() {
    var now = new Date();
    var diff = WEDDING_DATE.getTime() - now.getTime();

    if (diff <= 0) {
      setCountdownNum(elDays, "00");
      setCountdownNum(elHours, "00");
      setCountdownNum(elMins, "00");
      setCountdownNum(elSecs, "00");
      return;
    }

    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    var mins = Math.floor((diff / (1000 * 60)) % 60);
    var secs = Math.floor((diff / 1000) % 60);

    setCountdownNum(elDays, pad(days));
    setCountdownNum(elHours, pad(hours));
    setCountdownNum(elMins, pad(mins));
    setCountdownNum(elSecs, pad(secs));
  }

  if (elDays && elHours && elMins && elSecs) {
    tickCountdown();
    window.setInterval(tickCountdown, 1000);
  }

  /* ---------- Gentle parallax on hero glyph (respects reduced motion) ---------- */
  var topGlyph = document.querySelector(".glyph--top");

  if (!prefersReducedMotion && topGlyph) {
    window.addEventListener(
      "scroll",
      function () {
        var y = window.scrollY;
        topGlyph.style.transform = "translateY(" + Math.min(y * 0.08, 30) + "px)";
      },
      { passive: true }
    );
  }

  /* ---------- Elegant scroll progress line ---------- */
  var progressBar = document.getElementById("scrollProgressBar");
  function updateProgress() {
    if (!progressBar) return;
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = pct + "%";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  /* ---------- Subtle desktop-only hero parallax (background drifts slower than scroll) ---------- */
  var heroSection = document.querySelector(".hero");
  var desktopQuery = window.matchMedia("(min-width: 900px)");

  if (!prefersReducedMotion && heroSection) {
    window.addEventListener(
      "scroll",
      function () {
        if (!desktopQuery.matches) return;
        var offset = Math.min(window.scrollY * 0.15, 80);
        heroSection.style.backgroundPosition = "center calc(50% + " + offset + "px)";
      },
      { passive: true }
    );
  }

  /* ---------- Background music ---------- */
  var audio = document.getElementById("bg-music");
  var muteBtn = document.getElementById("mute-btn");
  var iconSound = document.getElementById("icon-sound");
  var iconMuted = document.getElementById("icon-muted");

  var musicStarted = false;

  function setMuteIcon(playing) {
    if (iconSound) iconSound.style.display = playing ? "" : "none";
    if (iconMuted) iconMuted.style.display = playing ? "none" : "";
  }

  function startMusic() {
    if (musicStarted || !audio) return;
    audio.volume = 0.45;
    var p = audio.play();
    if (p && p.then) {
      p.then(function () {
        musicStarted = true;
        setMuteIcon(true);
      }).catch(function () {
        // Browser blocked autoplay — muted icon stays, user can tap the button
      });
    }
  }

  // Try immediate autoplay on load (works on some browsers / after reload)
  window.addEventListener("load", function () {
    startMusic();
  });

  // Fallback: start on first user interaction (gate button click counts)
  document.addEventListener("click", startMusic, { once: true });
  document.addEventListener("touchstart", startMusic, { once: true });
  document.addEventListener("scroll", startMusic, { once: true });

  // Mute / unmute toggle
  if (muteBtn && audio) {
    muteBtn.addEventListener("click", function (e) {
      e.stopPropagation(); // don't double-trigger startMusic via document click
      if (!musicStarted) {
        startMusic();
        return;
      }
      if (audio.paused) {
        audio.play();
        setMuteIcon(true);
      } else {
        audio.pause();
        setMuteIcon(false);
      }
    });
  }

})();

/* ==========================================================================
   Floating Ornaments — full-viewport drifting crescents & stars
   (same container + same .flower-petal class, so the CSS fall animation applies)
   ========================================================================== */

function initFloatingFlowers() {
  var container = document.getElementById("floating-flowers");
  if (!container) return;

  // Respect user's motion preference — skip entirely
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Colour palette — brand tokens plus a soft gold for the ornaments
  var colors = [
    "#C9A96E", // gold
    "#E3B9A6", // soft rose
    "#F2DFD4", // blush
    "#A3B5A2", // sage
    "#C48670", // rose clay
    "#E8D5A8"  // pale gold
  ];

  // Fewer ornaments on smaller screens for performance
  var w = window.innerWidth;
  var PETAL_COUNT = w < 640 ? 5 : w < 1024 ? 9 : 14;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  // 1. Crescent moon
  function crescentSVG(color) {
    return '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
      + '<path d="M28 6 A16 16 0 1 0 28 34 A14 14 0 0 1 28 6 Z" fill="' + color + '"/>'
      + '</svg>';
  }

  // 2. Eight-pointed star (Islamic khatam) — two overlapping squares
  function khatamSVG(color) {
    return '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
      + '<g fill="' + color + '">'
      + '<rect x="9" y="9" width="22" height="22"/>'
      + '<rect x="9" y="9" width="22" height="22" transform="rotate(45 20 20)"/>'
      + '</g>'
      + '<circle cx="20" cy="20" r="4" fill="#F7F3EA"/>'
      + '</svg>';
  }

  // 3. Four-point sparkle
  function sparkleSVG(color) {
    return '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
      + '<path d="M20 2 L23 17 L38 20 L23 23 L20 38 L17 23 L2 20 L17 17 Z" fill="' + color + '"/>'
      + '</svg>';
  }

  var shapes = [crescentSVG, khatamSVG, sparkleSVG];

  for (var i = 0; i < PETAL_COUNT; i++) {
    var petal = document.createElement("div");
    petal.className = "flower-petal";

    var size = rand(14, 28);           // px
    var duration = rand(16, 28);       // seconds per full loop
    var delay = -rand(0, duration);    // negative = already mid-animation on page load
    var color = colors[Math.floor(Math.random() * colors.length)];
    var opacity = rand(0.45, 0.80);
    var shape = shapes[i % shapes.length]; // even mix of all three shapes

    petal.style.width = size.toFixed(0) + "px";
    petal.style.height = size.toFixed(0) + "px";
    petal.style.left = rand(0, 100).toFixed(1) + "%";
    petal.style.animationDuration = duration.toFixed(1) + "s";
    petal.style.animationDelay = delay.toFixed(1) + "s";
    petal.style.setProperty("--op", opacity.toFixed(2));

    petal.innerHTML = shape(color);
    container.appendChild(petal);
  }
}

document.addEventListener("DOMContentLoaded", initFloatingFlowers);

/* ==========================================================================
   Gate — Interactive enhancements
   · Name reveal
   · Mouse parallax on the background layer (desktop only)
   · Particle canvas (twinkling dots)
   · Button click ripple
   ========================================================================== */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // iOS FIX: touch devices skip the extra full-screen parallax image layer
  var isTouch = window.matchMedia("(hover: none)").matches || window.innerWidth <= 900;

  /* ------------------------------------------------------------------
      1. BLUR-FADE REVEAL — set name text directly then let CSS animate
  ------------------------------------------------------------------ */
  var name1El = document.getElementById("gateName1");
  var name2El = document.getElementById("gateName2");

  if (name1El) name1El.textContent = "Jihana Jalal";
  if (name2El) name2El.textContent = "Omer Shurook Vadakkan";

  // After names have faded in, add the subtle heartbeat glow
  var namesEl = document.querySelector(".gate__names");
  if (namesEl && !reduced) {
    window.setTimeout(function () {
      namesEl.classList.add("is-beating");
    }, 4500);
  }

  /* ------------------------------------------------------------------
     2. MOUSE PARALLAX — desktop only
  ------------------------------------------------------------------ */
  var parallaxLayer = document.getElementById("gateParallax");
  var gate = document.getElementById("gate");

  if (parallaxLayer && gate && !reduced && !isTouch) {
    // Reveal the parallax layer once page is loaded
    window.setTimeout(function () {
      parallaxLayer.classList.add("is-ready");
    }, 600);

    var tX = 0, tY = 0;   // target offsets
    var cX = 0, cY = 0;   // current (lerped) offsets
    var rafId = null;
    var MAX = 14;        // max pixel shift

    function lerp(a, b, t) { return a + (b - a) * t; }

    function tickParallax() {
      cX = lerp(cX, tX, 0.06);
      cY = lerp(cY, tY, 0.06);
      parallaxLayer.style.transform =
        "translate3d(" + cX.toFixed(2) + "px," + cY.toFixed(2) + "px,0)";
      rafId = requestAnimationFrame(tickParallax);
    }
    rafId = requestAnimationFrame(tickParallax);

    function onMouseMove(e) {
      var cx = window.innerWidth / 2;
      var cy = window.innerHeight / 2;
      tX = ((e.clientX - cx) / cx) * -MAX;
      tY = ((e.clientY - cy) / cy) * -MAX;
    }

    gate.addEventListener("mousemove", onMouseMove, { passive: true });

    // stop the RAF once gate is opened to save resources
    var gateBtn = document.getElementById("gateButton");
    if (gateBtn) {
      gateBtn.addEventListener("click", function () {
        cancelAnimationFrame(rafId);
        gate.removeEventListener("mousemove", onMouseMove);
      }, { once: true });
    }
  }

  /* ------------------------------------------------------------------
     3. PARTICLE CANVAS — tiny glowing dots that twinkle independently
  ------------------------------------------------------------------ */
  var canvas = document.getElementById("gateCanvas");
  if (canvas && !reduced) {
    var ctx = canvas.getContext("2d");
    var COLORS = ["rgba(196,134,112,", "rgba(94,122,104,", "rgba(227,185,166,"];
    var particles = [];
    var animFrameId;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });

    // spawn a single particle at a random position
    function makeParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 0.6 + Math.random() * 1.8,        // radius 0.6–2.4 px
        alpha: 0,
        maxAlpha: 0.25 + Math.random() * 0.55,
        speed: 0.004 + Math.random() * 0.008,    // fade speed
        phase: Math.random() * Math.PI * 2,      // sine offset
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      };
    }

    // populate: fewer on mobile
    var COUNT = window.innerWidth < 640 ? 40 : window.innerWidth < 1024 ? 90 : 140;
    for (var i = 0; i < COUNT; i++) {
      var p = makeParticle();
      p.phase = Math.random() * Math.PI * 2;
      particles.push(p);
    }

    function drawParticles(time) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var t = time * 0.001;
      for (var j = 0; j < particles.length; j++) {
        var pt = particles[j];
        // sine-driven alpha gives a natural twinkle
        pt.alpha = pt.maxAlpha * (0.5 + 0.5 * Math.sin(t * pt.speed * 60 + pt.phase));
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = pt.color + pt.alpha.toFixed(3) + ")";
        ctx.fill();

        // occasional soft glow halo on larger particles
        if (pt.r > 1.4) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.r * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = pt.color + (pt.alpha * 0.18).toFixed(3) + ")";
          ctx.fill();
        }
      }
      animFrameId = requestAnimationFrame(drawParticles);
    }
    animFrameId = requestAnimationFrame(drawParticles);

    // stop canvas when gate closes, and release its memory (iOS FIX)
    var gateBtnForCanvas = document.getElementById("gateButton");
    if (gateBtnForCanvas) {
      gateBtnForCanvas.addEventListener("click", function () {
        window.setTimeout(function () {
          cancelAnimationFrame(animFrameId);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.width = 0;
          canvas.height = 0;
        }, 1600);
      }, { once: true });
    }
  }

  /* ------------------------------------------------------------------
     4. BUTTON RIPPLE
  ------------------------------------------------------------------ */
  var gateButtonEl = document.getElementById("gateButton");
  if (gateButtonEl && !reduced) {
    gateButtonEl.addEventListener("click", function (e) {
      var rect = gateButtonEl.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var x = (e.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
      var y = (e.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
      var ripple = document.createElement("span");
      ripple.className = "gate__ripple";
      ripple.style.cssText =
        "width:" + size + "px;height:" + size + "px;left:" + x + "px;top:" + y + "px;";
      gateButtonEl.appendChild(ripple);
      // clean up after animation
      window.setTimeout(function () {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
      }, 750);
    });
  }

}());