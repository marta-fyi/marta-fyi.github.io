/* The promo engine -- shared by every case-study promo on the site.
 *
 * A promo is one master timeline in real seconds, played once and ending on
 * its last stage's final frame with Replay. The timeline is a pure function
 * of time: seek(t) writes every animated element's transform, opacity (and,
 * where a track asks for them, clip-path and stroke-dashoffset) for that
 * instant and nothing else, so playing, jumping, replaying, scroll sync and
 * reduced motion are all just seek().
 *
 * The engine owns time and the frame around the story: the motion tokens,
 * the keyframe tracks, the rail and its playback button, play-once on first
 * view, hover and tab pausing, reduced motion, resize, scroll sync and the
 * localhost QA hook (window.__promo). A promo supplies only its theme (CSS)
 * and its content: markup for the stage, and a choreography that turns that
 * markup into tracks.
 *
 * Geometry is kept in design px; the engine converts to CSS px at draw time,
 * and everything is sized with container query units -- never a transform
 * scale -- so text renders crisp at every width.
 *
 *   PromoEngine.mount(host, promo)   the live component on a page
 *   PromoEngine.frame(promo, n, o)   a standalone frame, for storyboards/QA
 *
 * promo = {
 *   stages, captions, description, stageW: { d, m },
 *   END, FRAME_T, TRANS_IN,            seconds; see mount()
 *   rail(stages)?                      markup for the stage buttons (.pm__node)
 *   markup(mobile) -> { stage, float } inner HTML of .pm__stage / .pm__float
 *   choreography(q, rect, mobile) -> { tracks, switches }
 *   onSeek(t, q)?                      per-frame extras (counters and the like)
 *   scrollSync?                        selector of headings, one per stage
 * }
 */
(function () {
  'use strict';

  /* --- motion tokens --------------------------------------------------- */
  function bez(x1, y1, x2, y2, id) {
    function cx(t) { return 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t; }
    function cy(t) { return 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t; }
    var f = function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 24; i++) { t = (lo + hi) / 2; if (cx(t) < x) lo = t; else hi = t; }
      return cy(t);
    };
    f.id = id; return f;
  }
  var ENTER = bez(.22, 1, .36, 1, 'cubic-bezier(.22,1,.36,1)');
  var EXIT = bez(.55, 0, 1, .45, 'cubic-bezier(.55,0,1,.45)');
  var TRAVEL = bez(.65, 0, .35, 1, 'cubic-bezier(.65,0,.35,1)');
  var LIN = function (p) { return p; }; LIN.id = 'linear';
  var D_IN = .45, D_OUT = .25, D_SAT = .18;
  function travelDur(px) { return px < 40 ? .3 : px <= 200 ? .45 : .55; }

  /* --- markup helpers -------------------------------------------------- */
  var BASE_ICONS = {
    pause:  '<path d="M9 6v12M15 6v12"/>',
    play:   '<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>'
  };
  function icons(set) {
    var all = {}, k;
    for (k in BASE_ICONS) all[k] = BASE_ICONS[k];
    for (k in set) all[k] = set[k];
    return function (n, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + all[n] + '</svg>'; };
  }
  var ic = icons({});
  function U(n) { return 'calc(' + n + ' * var(--u))'; }
  function at(x, y, w, h) {
    return 'left:' + U(x) + ';top:' + U(y) + (w != null ? ';width:' + U(w) : '') + (h != null ? ';height:' + U(h) : '');
  }
  function ext(a, b) { for (var k in b) a[k] = b[k]; return a; }
  var LIFT = '<i class="pm-lift"></i>';

  /* The default rail: a track with a node per stage, labels under the dots. */
  function defaultRail(stages) {
    return '<div class="pm__rail" role="group" aria-label="Stages"><div class="pm__track"><i class="pm__fill" data-a="railfill"></i></div>' +
      stages.map(function (s, i) {
        var cls = i === 0 ? '' : i === stages.length - 1 ? ' pm__node--end' : ' pm__node--mid';
        return '<button class="pm__node' + cls + '" type="button" data-stage="' + i + '" style="left:' + (i * 100 / (stages.length - 1)) + '%"><span>' + s + '</span></button>';
      }).join('') + '</div>';
  }
  function ppButton() { return '<button class="pm__pp" type="button" aria-label="Pause animation">' + ic('pause') + '</button>'; }

  /* --- tracks ---------------------------------------------------------- */
  /* Properties: x, y (design px), s, sx, sy (scale), o (opacity), l (lift:
     opacity of the deeper shadow in a .pm-lift child), cp (clip reveal from
     the top, 0..1), dp (stroke drawn, 0..1, for paths with pathLength="1"). */
  var DEF = { x: 0, y: 0, s: 1, sx: 1, sy: 1, o: 1, l: 0, cp: 1, dp: 1 };
  var PROPS = ['x', 'y', 's', 'sx', 'sy', 'o', 'l', 'cp', 'dp'];

  /* Keys: [[time, {props}, ease], ...]. Each property is interpolated only
     between the keys that set it, so opacity and position can have their
     own timing on one element. The ease shapes the segment arriving at a key. */
  function Track(el, keys) {
    this.el = el; this.last = ''; this.p = {}; this.active = [];
    this.lift = keys.some(function (k) { return 'l' in k[1]; }) ? el.querySelector(':scope > .pm-lift') : null;
    keys.sort(function (a, b) { return a[0] - b[0]; });
    for (var j = 0; j < PROPS.length; j++) {
      var n = PROPS[j], list = [];
      keys.forEach(function (k) { if (n in k[1]) list.push({ t: k[0], v: k[1][n], e: k[2] || ENTER }); });
      if (list.length) {
        this.p[n] = list;
        for (var i = 1; i < list.length; i++) if (list[i].v !== list[i - 1].v) this.active.push([list[i - 1].t, list[i].t]);
      }
    }
    this.clip = !!this.p.cp; this.dash = !!this.p.dp;
  }
  Track.prototype.val = function (n, t) {
    var k = this.p[n]; if (!k) return DEF[n];
    if (t <= k[0].t) return k[0].v;
    for (var i = 1; i < k.length; i++) if (t < k[i].t) {
      var a = k[i - 1], b = k[i]; return a.v + (b.v - a.v) * b.e((t - a.t) / (b.t - a.t));
    }
    return k[k.length - 1].v;
  };
  Track.prototype.apply = function (t, px) {
    var v = {}; for (var j = 0; j < PROPS.length; j++) v[PROPS[j]] = this.val(PROPS[j], t);
    var tr = (v.x || v.y ? 'translate(' + (v.x * px).toFixed(2) + 'px,' + (v.y * px).toFixed(2) + 'px)' : '') +
             (v.s * v.sx !== 1 || v.s * v.sy !== 1 ? ' scale(' + (v.s * v.sx).toFixed(4) + ',' + (v.s * v.sy).toFixed(4) + ')' : '');
    var moving = this.active.some(function (r) { return t >= r[0] - .1 && t < r[1]; });
    var key = tr + '|' + v.o.toFixed(3) + '|' + v.l.toFixed(3) + '|' + moving;
    if (this.clip) key += '|c' + v.cp.toFixed(4);
    if (this.dash) key += '|d' + v.dp.toFixed(4);
    if (key === this.last) return;
    this.last = key;
    this.el.style.willChange = moving ? 'transform, opacity' : '';   /* only around a move */
    this.el.style.transform = tr;
    this.el.style.opacity = v.o >= 0.999 ? '1' : v.o.toFixed(3);   /* explicit: some elements default to 0 in CSS */
    this.el.style.visibility = v.o <= 0.001 ? 'hidden' : '';
    if (this.lift) this.lift.style.opacity = v.l.toFixed(3);
    if (this.clip) this.el.style.clipPath = v.cp >= 0.9999 ? 'none' : 'inset(0 0 ' + ((1 - v.cp) * 100).toFixed(3) + '% 0)';
    if (this.dash) this.el.style.strokeDashoffset = (1 - v.dp).toFixed(4);
  };

  /* --- frames ---------------------------------------------------------- */
  /* Build a frame inside a size container. Returns the element plus seek();
     call init() once it is in the document, since slots are measured. */
  function create(P, mobile) {
    var el = document.createElement('div');
    el.className = 'pm' + (mobile ? ' pm--m' : '') + (P.cls ? ' ' + P.cls : '');
    var m = P.markup(mobile);
    el.innerHTML = (P.rail || defaultRail)(P.stages) + ppButton() +
      '<div class="pm__anim" aria-hidden="true">' +
      P.captions.map(function (c, i) { return '<p class="pm__cap" data-a="cap' + i + '">' + c + '</p>'; }).join('') +
      '<div class="pm__stage">' + m.stage + '</div>' +
      '<div class="pm__float">' + m.float + '</div></div>' +
      '<p class="pm-sr">' + P.description + '</p>';
    var stage = el.querySelector('.pm__stage'), W = mobile ? P.stageW.m : P.stageW.d;
    var nodes = Array.prototype.slice.call(el.querySelectorAll('.pm__node'));
    var tracks = [], switches = [0], current = -1, now = 0;
    function q(n) { return el.querySelector('[data-a="' + n + '"]'); }
    function px() { return stage.getBoundingClientRect().width / W; }   /* CSS px per design px */
    function rect(e) {
      var r = e.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = s.width / W;
      return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
    }
    function stageAt(t) { var s = 0; for (var i = 1; i < switches.length; i++) if (t >= switches[i]) s = i; return s; }
    function setStage(i) {
      if (i === current) return;
      current = i;
      nodes.forEach(function (n, k) {
        if (k === i) n.setAttribute('aria-current', 'step'); else n.removeAttribute('aria-current');
        if (k < i) n.setAttribute('data-done', ''); else n.removeAttribute('data-done');
      });
    }
    function seek(t) {
      now = t;
      var k = px();
      for (var i = 0; i < tracks.length; i++) tracks[i].apply(t, k);
      setStage(stageAt(t));
      if (P.onSeek) P.onSeek(t, q);
    }
    function init() {
      tracks.forEach(function (tr) {
        tr.el.style.transform = ''; tr.el.style.opacity = ''; tr.el.style.visibility = ''; tr.el.style.willChange = '';
        if (tr.clip) tr.el.style.clipPath = ''; if (tr.dash) tr.el.style.strokeDashoffset = '';
      });
      var c = P.choreography(q, rect, mobile);
      tracks = c.tracks; switches = c.switches;
    }
    /* resizing changes CSS px per design px: redraw the same instant */
    function redraw() { tracks.forEach(function (tr) { tr.last = ''; }); seek(now); }
    function dump() {
      return tracks.map(function (tr) {
        var keys = {}; for (var n in tr.p) keys[n] = tr.p[n].map(function (k) { return { t: k.t, v: k.v, ease: k.e.id || 'custom' }; });
        return { target: '[data-a="' + tr.el.getAttribute('data-a') + '"]', props: keys };
      });
    }
    return { el: el, seek: seek, init: init, redraw: redraw, dump: dump, nodes: nodes, pp: el.querySelector('.pm__pp'), mobile: mobile,
             q: q, rect: rect, switches: function () { return switches; } };
  }

  /* --- the live component on the page --------------------------------- */
  /* END: the closing frame. FRAME_T[i]: stage i's final frame. TRANS_IN[i]:
     the start of the standard transition into stage i (a rail click plays
     from there to FRAME_T[i]; the last stage plays on to END). */
  function mount(host, P) {
    var END = P.END, FRAME_T = P.FRAME_T, TRANS_IN = P.TRANS_IN, last = P.stages.length - 1;
    var narrow = window.matchMedia('(max-width: 767px)');
    var still = window.matchMedia('(prefers-reduced-motion: reduce)');
    var f = null, t = 0, state = 'ready', stopAt = END, inView = false, hover = false, raf = 0, prev = 0;
    /* state: ready (first frame, waiting to be seen) | playing | paused | ended */

    function running() { return state === 'playing' && inView && !hover && !document.hidden; }
    function label() {
      if (still.matches) { f.pp.hidden = true; return; }
      f.pp.hidden = false;
      var m = state === 'playing' ? ['Pause animation', 'pause'] : state === 'ended' ? ['Replay animation', 'replay'] : ['Play animation', 'play'];
      f.pp.setAttribute('aria-label', m[0]); f.pp.innerHTML = ic(m[1]);
    }
    function tick(ts) {
      raf = 0;
      if (!running()) return;
      var dt = prev ? Math.min(.1, (ts - prev) / 1000) : 0;
      prev = ts;
      t = Math.min(stopAt, t + dt);
      f.seek(t);
      if (t >= stopAt) { state = stopAt >= END ? 'ended' : 'paused'; stopAt = END; label(); return; }
      raf = requestAnimationFrame(tick);
    }
    function sync() {
      if (running() && !raf) { prev = 0; raf = requestAnimationFrame(tick); }
      if (!running() && raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    function play(from, until) { if (from != null) { t = from; f.seek(t); } stopAt = until || END; state = 'playing'; label(); sync(); }
    /* jump to a stage: the standard transition, or an instant cut when still */
    function goTo(i, cut) {
      if (cut || still.matches || i === 0) { t = i === last && still.matches ? END : FRAME_T[i]; f.seek(t); state = still.matches || i === last && t >= END ? 'ended' : 'paused'; label(); sync(); return; }
      play(TRANS_IN[i], i === last ? END : FRAME_T[i]);
    }

    function build() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      host.innerHTML = '';
      f = create(P, narrow.matches);
      host.appendChild(f.el);
      f.init();
      if (still.matches) { t = END; state = 'ended'; }
      f.seek(t);
      f.nodes.forEach(function (n, i) {
        n.addEventListener('click', function () {
          if (still.matches || i === 0) { t = FRAME_T[i]; f.seek(t); state = still.matches ? 'ended' : 'paused'; label(); sync(); return; }
          play(TRANS_IN[i], i === last ? END : FRAME_T[i]);   /* the standard transition into that stage */
        });
      });
      f.pp.addEventListener('click', function () {
        if (state === 'playing') { state = 'paused'; label(); sync(); }
        else if (state === 'ended') play(0);
        else play(null);
      });
      f.el.addEventListener('mouseenter', function () { hover = true; sync(); });
      f.el.addEventListener('mouseleave', function () { hover = false; sync(); });
      label(); sync();
      /* dev only: drive the master timeline from the console or Playwright */
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
        window.__promo = {
          frame: f, tracks: f.dump, END: END, FRAME_T: FRAME_T, TRANS_IN: TRANS_IN, switches: f.switches,
          seek: function (sec) { state = 'paused'; label(); sync(); t = sec; f.seek(t); },
          state: function () { return state; }
        };
      }
    }

    new IntersectionObserver(function (es) {
      inView = es[0].intersectionRatio >= .5;
      if (inView && state === 'ready' && !still.matches) play(0);   /* once, from the start */
      sync();
    }, { threshold: [0, .5, 1] }).observe(host);
    if (window.ResizeObserver) new ResizeObserver(function () { if (f) f.redraw(); }).observe(host);
    document.addEventListener('visibilitychange', sync);
    (narrow.addEventListener ? narrow.addEventListener('change', function () { build(); }) : narrow.addListener(function () { build(); }));
    if (still.addEventListener) still.addEventListener('change', function () { build(); });
    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (f) { f.init(); f.seek(t); } });

    /* Scroll sync: each stage's heading selects that stage's final frame as
       it crosses the middle of the viewport. It only applies while the promo
       is sticky (the wide layout), where the reader can see both at once;
       scrolling there mid-play stops playback and hands control to scroll. */
    if (P.scrollSync) {
      var heads = Array.prototype.slice.call(document.querySelectorAll(P.scrollSync));
      var sticky = window.matchMedia('(min-width: 1200px)'), shown = -1, ticking = false;
      var onScroll = function () {
        ticking = false;
        if (!sticky.matches || !heads.length) return;
        var mid = window.innerHeight / 2, idx = -1;
        heads.forEach(function (h, i) { if (h.getBoundingClientRect().top <= mid) idx = i; });
        if (idx === shown) return;
        shown = idx;
        if (idx < 0 || state === 'ready') return;   /* before the first heading, or not yet seen: leave it be */
        goTo(idx, true);
      };
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    }
  }

  /* storyboard / QA: a standalone frame at stage n's final frame, or time t.
     opts.into must be a size container (container-type: inline-size). */
  function frame(P, n, opts) {
    opts = opts || {};
    var f = create(P, !!opts.mobile);
    (opts.into || document.body).appendChild(f.el);
    f.init();
    f.seek(opts.t != null ? opts.t : P.FRAME_T[n]);
    return f;
  }

  window.PromoEngine = {
    bez: bez, ENTER: ENTER, EXIT: EXIT, TRAVEL: TRAVEL, LIN: LIN, D_IN: D_IN, D_OUT: D_OUT, D_SAT: D_SAT, travelDur: travelDur,
    Track: Track, icons: icons, U: U, at: at, ext: ext, LIFT: LIFT,
    create: create, mount: mount, frame: frame
  };
})();
