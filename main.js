/* The site

   Four jobs: drive the inline specimen, run the docket's two toggles, reveal
   the findings plate as it scrolls in, and report this page's own score in
   the docket and the footer.

   The last one is the point. A site arguing that pages should be measured,
   which does not publish its own measurement, is asking to be measured by
   somebody else. Every number here comes from the real library
   (quoin.global.js), not a copy of its logic — the specimen and the page
   score both call window.quoin directly. */

(function () {
  "use strict";

  var GRID = { pitch: 8, tolerance: 0.5 };

  /* Display type opts out, same reasoning as ever: a 136px cropped headline
     or a 64px closing statement is a shape, not a line of reading, and the
     readouts measuring themselves would be a feedback loop. Stated here
     rather than hidden, because a score with a quiet exclusion list is a
     score with a thumb on it. */
  var IGNORE = [
    ".masthead-headline", ".stat-banner", ".plate-close", ".stat-num",
    ".specimen-score", ".diagram-glyphs", ".plate-num",
    ".docket-score", ".footer-score", "pre", "pre *",
  ];

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* ---------------------------------------------------------------- *
     The specimen — seated in place, not in an iframe
   * ---------------------------------------------------------------- */

  function driveSpecimen() {
    var sheet = document.getElementById("specimenSheet");
    var scoreEl = document.getElementById("specimenScore");
    var noteEl = document.getElementById("specimenNote");
    var seatBtn = document.getElementById("specimenSeat");
    var gridBtn = document.getElementById("specimenGridToggle");
    var resetBtn = document.getElementById("specimenReset");
    if (!sheet || !scoreEl || !window.quoin) return;

    var seated = null;

    function refresh() {
      var result = window.quoin.verifyGrid({
        pitch: GRID.pitch, tolerance: GRID.tolerance, root: sheet,
      });
      var total = result.report.total;
      var share = total ? Math.round((result.report.onGrid / total) * 100) : 0;
      scoreEl.textContent = share + "%";
      return { share: share, onGrid: result.report.onGrid, total: total };
    }

    var initial = refresh();
    if (noteEl) {
      noteEl.textContent = initial.total
        ? initial.onGrid + " of " + initial.total + " first baselines on the grid"
        : "nothing to measure yet";
    }

    if (seatBtn) {
      seatBtn.addEventListener("click", function () {
        if (seated) return;
        var before = refresh();
        var t0 = performance.now();
        seated = window.quoin.seatPage({
          pitch: GRID.pitch, tolerance: GRID.tolerance, root: sheet, mode: "full",
        });
        var elapsed = Math.round(performance.now() - t0);
        var after = refresh();

        scoreEl.style.color = "var(--yellow)";
        seatBtn.setAttribute("aria-pressed", "true");

        var missed = seated.missed
          ? ", and " + seated.missed + " it could not move, which it says rather than counts as fixed"
          : "";
        if (noteEl) {
          noteEl.textContent = before.share + "% to " + after.share + "% in " + seated.passes +
            (seated.passes === 1 ? " sweep" : " sweeps") + ", " + elapsed + "ms" + missed + ".";
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!seated) return;
        seated.undo();
        seated = null;
        scoreEl.style.color = "";
        if (seatBtn) seatBtn.setAttribute("aria-pressed", "false");
        refresh();
        if (noteEl) noteEl.textContent = "reset — back to a leading of 1.47.";
      });
    }

    if (gridBtn) {
      gridBtn.addEventListener("click", function () {
        var on = sheet.classList.toggle("show-grid");
        gridBtn.setAttribute("aria-pressed", on ? "true" : "false");
        gridBtn.textContent = on ? "hide grid" : "show grid";
      });
    }
  }

  /* ---------------------------------------------------------------- *
     The docket — the page-wide grid, and the misregistration joke
   * ---------------------------------------------------------------- */

  function docketControls() {
    var gridBtn = document.getElementById("docketGrid");
    if (gridBtn) {
      gridBtn.addEventListener("click", function () {
        var on = document.body.classList.toggle("grid-on");
        gridBtn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    var regBtn = document.getElementById("docketRegister");
    var masthead = document.getElementById("masthead");
    if (regBtn && masthead) {
      /* Out of register by default. It is a decision, not an accident: the
         masthead is the one place on the sheet allowed to be off the grid
         it is arguing for, because it is the joke rather than the argument. */
      var misregistered = true;
      regBtn.addEventListener("click", function () {
        misregistered = !misregistered;
        masthead.classList.toggle("in-register", !misregistered);
        regBtn.textContent = misregistered ? "in register" : "out of register";
        regBtn.setAttribute("aria-pressed", misregistered ? "false" : "true");
      });
    }
  }

  /* ---------------------------------------------------------------- *
     Plate V reveals as it scrolls in
   * ---------------------------------------------------------------- */

  function revealFindings() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".finding"));
    if (!items.length) return;
    function show(el) { el.classList.add("is-visible"); }
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(show);
    }
    /* A failed observer (or a browser that never fires it for an
       off-screen-at-load element) should not leave the plate blank. */
    setTimeout(function () { items.forEach(show); }, 2600);
  }

  /* ---------------------------------------------------------------- *
     A rule that snaps to the pitch under the pointer
   * ---------------------------------------------------------------- */

  function pitchCursor() {
    var rule = document.querySelector(".pitch-cursor");
    if (!rule) return;
    document.addEventListener("pointermove", function (e) {
      rule.classList.add("on");
      var y = Math.round(e.clientY / GRID.pitch) * GRID.pitch;
      rule.style.transform = "translateY(" + y + "px)";
    });
    document.documentElement.addEventListener("mouseleave", function () {
      rule.classList.remove("on");
    });
  }

  /* ---------------------------------------------------------------- *
     This page's own score
   * ---------------------------------------------------------------- */

  function reportSelf() {
    var docketOut = document.getElementById("docketScore");
    var footerOut = document.getElementById("footerScore");
    if ((!docketOut && !footerOut) || !window.quoin) return;

    var result = window.quoin.verifyGrid({
      pitch: GRID.pitch,
      tolerance: GRID.tolerance,
      ignore: IGNORE,
    });
    var total = result.report.total;
    var share = total ? Math.round((result.report.onGrid / total) * 100) : 0;
    var text = result.report.onGrid + " of " + total + " · " + share + "%";

    if (docketOut) docketOut.textContent = text;
    if (footerOut) footerOut.textContent = text;
  }

  ready(function () {
    var version = document.querySelector("[data-version]");
    if (version && window.quoin) version.textContent = window.quoin.version;

    driveSpecimen();
    docketControls();
    revealFindings();
    pitchCursor();

    /* Webfonts change every metric on the page, so measuring before they
       land measures a fallback. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        requestAnimationFrame(reportSelf);
      });
    } else {
      window.addEventListener("load", reportSelf);
    }
  });
})();
