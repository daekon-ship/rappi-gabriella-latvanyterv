/* =========================================================================
   Rappi Gabriella — látványterv
   Scroll-vezérelt mozgás, parallax, rezgés. Nincs külső függőség.
   ========================================================================= */
(function () {
  'use strict';

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine   = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduce   = mqReduce.matches;
  var fine     = mqFine.matches;

  /* Opcionális demo-kapcsoló: ?motion=force
     Rendszerszintű reduced-motion mellett is lejátssza a mozgást
     (pl. látványterv-bemutatóhoz). Normál látogatót nem érint. */
  try {
    if (window.location.search.indexOf('motion=force') !== -1) {
      window.sessionStorage.setItem('motionForce', '1');
      reduce = false;
    } else if (window.sessionStorage.getItem('motionForce') === '1') {
      reduce = false;
    }
  } catch (e) { /* privát mód */ }

  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------
     Év a footerben
  --------------------------------------------------------------- */
  var yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------------------------------------------------------
     Mobil menü
  --------------------------------------------------------------- */
  (function menu() {
    var toggle = $('[data-menu-toggle]');
    var panel  = $('[data-menu]');
    if (!toggle || !panel) return;

    var open = false;
    var timer = null;

    function setOpen(next) {
      open = next;
      toggle.setAttribute('aria-expanded', String(next));
      toggle.setAttribute('aria-label', next ? 'Menü bezárása' : 'Menü megnyitása');
      document.body.style.overflow = next ? 'hidden' : '';

      if (next) {
        if (timer) { clearTimeout(timer); timer = null; }
        panel.hidden = false;
        // kényszerített reflow, hogy az átmenet biztosan induljon (rAF-független)
        void panel.offsetHeight;
        panel.classList.add('is-open');
        var first = $('a', panel);
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 420);
      } else {
        panel.classList.remove('is-open');
        timer = setTimeout(function () {
          if (!panel.classList.contains('is-open')) panel.hidden = true;
        }, 900);
      }
    }

    toggle.addEventListener('click', function () { setOpen(!open); });

    $$('a', panel).forEach(function (a) {
      a.addEventListener('click', function () { if (open) setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { setOpen(false); toggle.focus(); }
    });

    window.addEventListener('resize', function () {
      if (open && window.innerWidth > 980) setOpen(false);
    }, { passive: true });
  })();

  /* ---------------------------------------------------------------
     Nav állapot + felfedések (IntersectionObserver)
  --------------------------------------------------------------- */
  var nav = $('[data-nav]');

  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        revealIO.unobserve(e.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });

  $$('[data-reveal], [data-lines]').forEach(function (el) { revealIO.observe(el); });

  var activeIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      e.target.classList.toggle('is-active', e.isIntersecting);
    });
  }, { threshold: 0.28 });

  $$('[data-panel]').forEach(function (el) { activeIO.observe(el); });

  /* ---------------------------------------------------------------
     Elemek a scroll-höz
  --------------------------------------------------------------- */
  var hero      = $('[data-hero]');
  var parallax  = $$('[data-parallax]');
  var story     = $('[data-story]');
  var timeline  = $('[data-timeline]');
  var shift     = $('[data-shift]');
  var resonance = $('[data-resonance]');
  var waves     = $$('.wave');
  var glow      = $('[data-glow]');
  var astro     = $('[data-astro]');
  var astroGrps = astro ? $$('[data-depth]', astro) : [];
  var magnets   = $$('[data-magnetic]');

  var vh = window.innerHeight;
  var vw = window.innerWidth || document.documentElement.clientWidth;
  /* mobilon visszafogottabb mozgás: kevesebb amplitúdó, kevesebb hullám */
  var mobile = vw < 760;
  var AMP = mobile ? 0.6 : 1;
  var waveCount = Math.max(3, waves.length - (mobile ? 3 : 0));
  var mouseX = window.innerWidth * 0.5, mouseY = window.innerHeight * 0.5;
  var glowX = mouseX, glowY = mouseY, glowTX = mouseX, glowTY = mouseY;
  var astroNX = 0, astroNY = 0, astroTX = 0, astroTY = 0;

  function onResize() {
    vh = window.innerHeight;
    vw = window.innerWidth || document.documentElement.clientWidth;
    var wasMobile = mobile;
    mobile = vw < 760;
    if (mobile !== wasMobile) { AMP = mobile ? 0.6 : 1; waveCount = Math.max(3, waves.length - (mobile ? 3 : 0)); }
    requestFrame();
  }
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });

  if (fine) {
    window.addEventListener('pointermove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (glow) { glowTX = mouseX; glowTY = mouseY; }
      if (astro) {
        var r = astro.getBoundingClientRect();
        if (r.bottom > -200 && r.top < vh + 200) {
          astroTX = clamp((e.clientX - (r.left + r.width * 0.62)) / (r.width * 0.5), -1, 1);
          astroTY = clamp((e.clientY - (r.top + r.height * 0.5)) / (r.height * 0.5), -1, 1);
        }
      }
      requestFrame();
    }, { passive: true });
  }

  /* ---------------------------------------------------------------
     Magnetic gombok — csak asztali, csak finom mutatóval
  --------------------------------------------------------------- */
  var magnetState = [];
  if (fine && !reduce) {
    magnets.forEach(function (el) {
      var m = { el: el, x: 0, y: 0, tx: 0, ty: 0 };
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        m.tx = (e.clientX - (r.left + r.width / 2)) * 0.24;
        m.ty = (e.clientY - (r.top + r.height / 2)) * 0.34;
        requestFrame();
      });
      el.addEventListener('pointerleave', function () {
        m.tx = 0; m.ty = 0; requestFrame();
      });
      magnetState.push(m);
    });
  }

  /* ---------------------------------------------------------------
     Egyetlen rAF hurk — csak akkor fut, amikor kell
  --------------------------------------------------------------- */
  var frameQueued = false;

  function requestFrame() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(frame);
  }

  function frame() {
    frameQueued = false;
    if (update()) requestFrame();
  }

  function update() {
    var moving = false;
    var y = window.pageYOffset || document.documentElement.scrollTop;

    /* nav */
    if (nav) nav.classList.toggle('is-scrolled', y > 40);

    if (reduce) return false;

    /* --- HERO: zoom + sötétítés + cinematic átmenet --- */
    if (hero) {
      var p = clamp(y / Math.max(vh, 1), 0, 1);
      hero.style.setProperty('--p', p.toFixed(4));
    }

    /* --- Parallax képek: a KÉP csúszik a statikus, levágott ablakban --- */
    for (var i = 0; i < parallax.length; i++) {
      var el = parallax[i];
      var r = el.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue;
      var depth = parseFloat(el.getAttribute('data-parallax')) || 0.08;
      var center = r.top + r.height / 2 - vh / 2;
      var maxShift = r.height * 0.09;
      var ty = clamp(-center * depth, -maxShift, maxShift);
      var im = el._pxImg || (el._pxImg = el.querySelector('img'));
      if (im) im.style.transform = 'translate3d(0,' + ty.toFixed(2) + 'px,0) scale(1.2)';
    }

    /* --- STORY: háttérparallax + vonalrajzolás --- */
    if (story) {
      var rs = story.getBoundingClientRect();
      if (rs.bottom > -200 && rs.top < vh + 200) {
        var sp = clamp((vh - rs.top) / (vh + rs.height), 0, 1);
        story.style.setProperty('--sp', sp.toFixed(4));
      }
    }
    if (timeline) {
      var rt = timeline.getBoundingClientRect();
      if (rt.bottom > -200 && rt.top < vh + 200) {
        var tp = clamp((vh * 0.82 - rt.top) / Math.max(rt.height, 1), 0, 1);
        timeline.style.transform = 'scaleY(' + tp.toFixed(4) + ')';
        if (tp > 0 && tp < 1) moving = true;
      }
    }

    /* --- SHIFT: finom forgatás / eltolás --- */
    if (shift) {
      var rf = shift.getBoundingClientRect();
      if (rf.bottom > -200 && rf.top < vh + 200) {
        var np = clamp((vh - rf.top) / (vh + rf.height), 0, 1);
        shift.style.setProperty('--sp', np.toFixed(4));
      }
    }

    /* --- HANGTÁL: scrollból induló hullámok + fénykövetés --- */
    if (resonance) {
      var rr = resonance.getBoundingClientRect();
      if (rr.top < vh && rr.bottom > 0) {
        var rp = clamp(-rr.top / Math.max(rr.height - vh, 1), 0, 1);

        for (var w = 0; w < waveCount; w++) {
          var local = rp * 2 - w * 0.18 + 0.1;
          var scale, alpha;
          if (local <= 0 || local >= 1) {
            scale = 1.02; alpha = 0;
          } else {
            scale = 1.02 + local;
            alpha = Math.sin(local * Math.PI) * 0.55;
          }
          waves[w].style.transform = 'translate3d(-50%,-50%,0) scale(' + scale.toFixed(3) + ')';
          waves[w].style.opacity = alpha.toFixed(3);
        }

        if (glow && fine) {
          glowX += (glowTX - glowX) * 0.055;
          glowY += (glowTY - glowY) * 0.055;
          glow.style.setProperty('--gx', glowX.toFixed(1) + 'px');
          glow.style.setProperty('--gy', glowY.toFixed(1) + 'px');
          if (Math.abs(glowTX - glowX) > 0.5 || Math.abs(glowTY - glowY) > 0.5) moving = true;
        }
      }
    }

    /* --- ASZTRO: egérparallax --- */
    if (astro && fine && astroGrps.length) {
      astroNX += (astroTX - astroNX) * 0.05;
      astroNY += (astroTY - astroNY) * 0.05;
      if (Math.abs(astroTX - astroNX) > 0.002 || Math.abs(astroTY - astroNY) > 0.002) moving = true;
      for (var g = 0; g < astroGrps.length; g++) {
        var grp = astroGrps[g];
        var d = parseFloat(grp.getAttribute('data-depth')) || 0.3;
        grp.style.transform = 'translate(' + (astroNX * d * 30 * AMP).toFixed(2) + 'px,' +
                              (astroNY * d * 30 * AMP).toFixed(2) + 'px)';
      }
    }

    /* --- Magnetic gombok --- */
    for (var m = 0; m < magnetState.length; m++) {
      var ms = magnetState[m];
      ms.x += (ms.tx - ms.x) * 0.16;
      ms.y += (ms.ty - ms.y) * 0.16;
      if (Math.abs(ms.tx - ms.x) > 0.1 || Math.abs(ms.ty - ms.y) > 0.1) moving = true;
      ms.el.style.transform = 'translate3d(' + ms.x.toFixed(2) + 'px,' + ms.y.toFixed(2) + 'px,0)';
    }

    return moving;
  }

  /* ---------------------------------------------------------------
     Indítás
  --------------------------------------------------------------- */
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('load', function () { update(); requestFrame(); });
  update();
  requestFrame();

  mqReduce.addEventListener && mqReduce.addEventListener('change', function (e) {
    /* demo-mód (?motion=force) felülírja a rendszerszintű beállítást */
    var forced = false;
    try { forced = window.sessionStorage.getItem('motionForce') === '1'; } catch (err) {}
    reduce = e.matches && !forced;
    requestFrame();
  });
  mqFine.addEventListener && mqFine.addEventListener('change', function (e) {
    fine = e.matches;
  });
})();
