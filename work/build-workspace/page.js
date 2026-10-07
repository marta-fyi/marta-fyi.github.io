/* Build Workspace -- the promo: one drawing, T1 C3.1 - Level 1, becoming the
 * place where the work collects. Store, Collaborate, Review, Report.
 *
 * The old workflow scattered a drawing's context across email, paper and
 * phones. Here the drawing never leaves the stage: everything comes to it
 * and stays attached.
 *
 * Grammar:
 *   - The drawing card, its sheet pill and (once it lands) the Latest chip
 *     are on screen in every frame.
 *   - Attachments live in the plan's coordinate space. Each is positioned
 *     from the camera on every frame -- same keys, same ease, so it rides a
 *     pan or zoom with no drift -- and keeps its on-screen size. Once
 *     attached, it stays to the end.
 *   - Modes are not attachments: the change outlines and the "Old version"
 *     watermark exist only in Review.
 *   - Office panels enter from the right and leave to the right; field items
 *     (the paper sheet, the phone, the markup scan) rise from the bottom and
 *     go back down; toasts and the banner share one bottom-left slot.
 *   - Only the red arrow and the captured photo travel between objects, by
 *     translation and uniform scale. Cards never morph.
 *   - Every stage change is the same 1.1 s: popovers and toasts out
 *     (0-180 ms), panels out (150-400), camera and rail connector together
 *     (300-900), next panels in (650-1100).
 *
 * Two authored frames share one choreography, sized with container query
 * units:  desktop 600x580 design px (>= 768px), mobile 340x740 (< 768px).
 * Time, tracks, rail, playback and the QA hook live in the shared engine,
 * tools/shared/promo.js; this file is content only.
 */
(function () {
  'use strict';

  var E = window.PromoEngine;
  var A = '/assets/promo-bw/';
  var STAGES = ['Store', 'Collaborate', 'Review', 'Report'];
  var CAPTIONS = ['Upload once, keep every version', 'Context pinned to the place',
                  'Changes clear, paper checked', 'Site evidence joins the record'];
  var DESCRIPTION = 'One drawing, T1 C3.1 – Level 1 of the Palo Alto project, collecting the work around it. ' +
    'Store: the sheet is uploaded as version 2.45.3, marked Latest, and the earlier versions 2.43.4 and 2.41.2 stay in its history. ' +
    'Collaborate: a comment and a task, “Move the west wall”, high priority, assigned to John Williams, are pinned to the plan, and a red arrow drawn on paper by John Williams is scanned and lands on the west wall. ' +
    'Review: the changes since version 2.43.4 are highlighted on the plan, one door added and three walls modified, and a printout of version 2.43.4 is scanned by its QR code and flagged as not the latest version. ' +
    'Report: a site photo taken with the Logbook camera, filed as Progress, lands on the plan as a photo pin, and every attachment points back to the same drawing.';

  /* stage starts, final frames, the closing frame */
  var S = [0, 4.5, 10.4, 15.9];
  var END = 21.2;
  var FRAME_T = [4.45, 10.35, 15.85, END];
  var TRANS_IN = [null, S[1], S[2], S[3]];

  /* --- icons ----------------------------------------------------------- */
  var ic = E.icons({
    chev:    '<path d="M6.5 9.5 12 15l5.5-5.5"/>',
    check:   '<path d="M5 12.5 9.8 17 19 7.5"/>',
    close:   '<path d="M6 6l12 12M18 6 6 18"/>',
    layers:  '<rect x="4.5" y="3.5" width="15" height="17" rx="2.5"/><path d="M12 3.5v17M8 8h1.5M8 12h1.5M8 16h1.5M14.5 8H16M14.5 12H16M14.5 16H16"/>',
    chat:    '<path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2v-10Z"/><path d="M8 9h8M8 12h5"/>',
    attach:  '<path d="M15.5 7.5v8a3.5 3.5 0 0 1-7 0V6a2.3 2.3 0 0 1 4.6 0v9a1.1 1.1 0 0 1-2.2 0V7.5"/>',
    tasks:   '<rect x="4" y="4.5" width="16" height="15" rx="2"/><path d="M7.5 9h3M7.5 12h3M7.5 15h3M13.5 12.3l1.6 1.6 3-3.2"/>',
    comment: '<path d="M5 5h14v11H9.5L5 19.5V5Z"/>',
    markup:  '<path d="M4 17.5c2-3 3.5-3 4.5-1.5s2.5 1.5 4-1"/><path d="M13.5 15l6-6a1.6 1.6 0 0 0-2.3-2.3l-6 6-.7 3 3-.7Z"/>',
    camera:  '<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4v-10Z"/><circle cx="12" cy="13.3" r="3.3"/>',
    gallery: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9.5" r="1.6"/><path d="m4.5 17 4.5-4.5 4 4 2.5-2.5 4 4"/>',
    user:    '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    flag:    '<path d="M6 20.5V4.5M6 5h11l-2.5 4L17 13H6"/>',
    alert:   '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.6v5.2M12 16.3v.1"/>'
  });
  var U = E.U, at = E.at, LIFT = E.LIFT;

  /* --- the plan ---------------------------------------------------------
     Plan px: the 2328x1608 crop of the clean T1 C3.1 sheet (plan.webp).
     Walls traced from the deck's changes visualizer, on the same pixels. */
  var PLAN = { w: 2328, h: 1608 };
  var SPOT = {
    comment: [1400, 420],                /* the plumbing room, between walls 2 and 3 */
    task:    [977.5, 560],               /* on the west wall */
    arrow:   [998, 700],                 /* the arrow's tip, at the west wall, clear of the printout */
    photo:   [1211, 1144]                /* the lobby */
  };
  var WALLS = [[977.5, 292, 977.5, 1269], [1299.5, 292, 1299.5, 457], [1505, 292, 1505, 537]];
  var DOOR = [796, 1086, 944, 1168];
  var VER = [
    { v: 'v2.45.3', d: '7 Dec 2024, 7:00 pm' },
    { v: 'v2.43.4', d: '3 Oct 2024, 7:00 pm' },
    { v: 'v2.41.2', d: '12 Sep 2024' }
  ];

  /* Layout per frame, design px. card: the drawing card in frame coords;
     cams: the plan's translate + scale for each framing (plan px -> card px
     is k * s, k = plan width at s=1 / PLAN.w). */
  var GEO = {
    d: { W: 600, H: 580, card: [16, 96, 568, 392], pw: 568,
         cams: { full: { x: 0, y: 0, s: 1 }, west: { x: -17.7, y: -25.7, s: 1.4 } },
         rail: [12, 60, 60], bar: { right: 12, top: 12 },
         vc: [348, 132, 228], task: { w: 214, side: 'left', dx: -22, dy: -18 }, thumb: [196, 404, 200], slot: [16, 18],
         paper: [100, 300, 400], phone: [406, 238, 166] },
    m: { W: 340, H: 740, card: [12, 100, 316, 300], pw: 434.3,
         cams: { full: { x: -84.5, y: 0, s: 1 }, west: { x: -131.2, y: -32.8, s: 1.4 } },
         rail: [8, 56, 40], bar: { left: 54, top: 10 },
         vc: [12, 412, 316], task: { w: 230, at: [24, 420] }, thumb: [70, 560, 200], slot: [12, 104],   /* the slot meets the printout's lower edge */
         paper: [12, 290, 316], phone: [176, 392, 152], m: true }
  };
  function cam(g, name) { return g.cams[name]; }
  /* where a plan point sits in frame coords under a camera */
  function onCard(g, c, p) {
    var k = g.pw / PLAN.w;
    return [g.card[0] + c.x + c.s * k * p[0], g.card[1] + c.y + c.s * k * p[1]];
  }

  /* --- components ------------------------------------------------------ */
  function rail(stages) {
    var s = '<div class="pm__rail bw-rail" role="group" aria-label="Stages">';
    stages.forEach(function (n, i) {
      s += '<button class="pm__node" type="button" data-stage="' + i + '"><b class="bw-badge num">' + (i + 1) + '</b><span>' + n + '</span></button>';
      if (i < stages.length - 1) s += '<span class="bw-cn"><i data-a="cn' + i + '"></i></span>';
    });
    return s + '</div>';
  }

  function topBar(g) {
    var pos = g.bar.right != null ? 'right:' + U(g.bar.right) : 'left:' + U(g.bar.left);
    return '<div class="bw-bar" style="' + pos + ';top:' + U(g.bar.top) + '">' +
      '<span class="bw-pill bw-sheet" data-a="sheet">T1 C3.1 – Level 1' + ic('chev') + '</span>' +
      '<span class="bw-pill bw-ver num" data-a="ver">v2.45.3</span>' +
      '<span class="bw-latest" data-a="latest"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path data-a="lcheck" pathLength="1" d="M5 12.5 9.8 17 19 7.5"/></svg>Latest' +
      '<i class="bw-ring" data-a="lring"></i></span>' +
      (g.m ? '' : '<span class="bw-pill bw-vcb" data-a="vcb">Version control' + ic('layers') + '</span>') +
      '</div>';
  }

  function toolRail(g) {
    var tools = [['chat', 'Chat'], ['attach', 'Attach'], ['tasks', 'Tasks'], ['comment', 'Comment'], ['markup', 'Markup']];
    return '<div class="bw-tools" data-a="tools" style="' + at(g.rail[0], g.rail[1], g.rail[2]) + '">' +
      tools.map(function (t) {
        return '<span class="bw-tool"><i class="bw-tool__hl" data-a="hl-' + t[0] + '"></i>' + ic(t[0]) + (g.m ? '' : '<span>' + t[1] + '</span>') + '</span>';
      }).join('') + '</div>';
  }

  function outlines() {
    var s = '<svg class="bw-out" viewBox="0 0 ' + PLAN.w + ' ' + PLAN.h + '" aria-hidden="true">';
    WALLS.forEach(function (w, i) {
      s += '<path class="bw-out__mod" data-a="w' + i + '" pathLength="1" d="M' + w[0] + ' ' + w[1] + 'V' + w[3] + '"/>';
    });
    var d = DOOR;
    s += '<path class="bw-out__add" data-a="door" pathLength="1" d="M' + d[0] + ' ' + d[1] + 'H' + d[2] + 'V' + d[3] + 'H' + d[0] + 'Z"/>';
    return s + '</svg>';
  }

  function drawingCard(g) {
    var c = g.card;
    return '<div class="bw-card" data-a="card" style="' + at(c[0], c[1], c[2], c[3]) + '">' +
      '<div class="bw-plan" data-a="plan" style="width:' + U(g.pw) + ';height:' + U(g.pw * PLAN.h / PLAN.w) + '">' +
      '<img class="bw-plan__img" data-a="planimg" src="' + A + 'plan.webp" alt="">' + outlines() + '</div>' +
      toolRail(g) + topBar(g) + '</div>';
  }

  function versionPanel(g) {
    var v = g.vc;
    function row(i, extra) {
      return '<div class="bw-vrow' + (extra ? ' bw-vrow--open' : '') + '" data-a="vr' + i + '">' +
        '<span class="bw-node">' + (i === 0 ? '<i data-a="vnode"></i>' : '') + '</span>' +
        '<div class="bw-vrow__v num">' + VER[i].v + '</div><div class="bw-vrow__d num">' + VER[i].d + '</div>' + (extra || '') + '</div>';
    }
    var open = '<div class="bw-k">Changes</div><div class="bw-vrow__t">West wall · Main door</div>' +
      '<div class="bw-k">Note</div><div class="bw-vrow__t">Updated room 4.5 to fit plumbing around the ducts.</div>';
    return '<div class="c bw-panel" data-a="vc" style="' + at(v[0], v[1], v[2]) + '">' + LIFT +
      '<div class="ch"><div class="ch__t">Version control</div>' + ic('close', 'ch__x') + '</div>' +
      '<div class="bw-hist"><span class="bw-hist__line"></span>' + row(0, open) + row(1) + row(2) + '</div></div>';
  }

  function changesPanel(g) {
    var v = g.vc;
    var tiles = [['add', 1, 'Added', 'ca'], ['rem', 0, 'Removed', 'cr'], ['mod', 3, 'Modified', 'cm']];
    return '<div class="c bw-panel" data-a="cv" style="' + at(v[0], v[1], v[2]) + '">' + LIFT +
      '<div class="ch"><div class="ch__t">Changes visualizer</div>' + ic('close', 'ch__x') + '</div>' +
      '<div class="bw-sub num">v2.45.3 vs v2.43.4</div>' +
      '<div class="bw-tiles">' + tiles.map(function (t) {
        return '<div class="bw-tile bw-tile--' + t[0] + '"><div class="bw-tile__n num" data-a="' + t[3] + '">0</div><div class="bw-tile__l">' + t[2] + '</div></div>';
      }).join('') + '</div>' +
      '<div class="bw-k">Disciplines</div><div class="bw-chips"><span>Installation</span><span>Plumbing</span><span>Lighting</span></div>' +
      (g.m ? '' : '<div class="bw-list"><div class="bw-li bw-li--add">Front Door</div><div class="bw-li bw-li--mod">Basic Wall <span class="num">×3</span></div></div>') +
      '</div>';
  }

  function pin(key, kind) {
    var glyph = { comment: 'chat', task: 'tasks', photo: 'camera' }[kind];
    return '<span class="bw-pin bw-pin--' + kind + '" data-a="' + key + '"><i class="bw-pin__sh" data-a="' + key + 'sh"></i>' +
      '<span class="bw-pin__b"><span class="bw-pin__i">' + ic(glyph) + '</span></span><i class="bw-ring" data-a="' + key + 'ring"></i></span>';
  }

  /* the red arrow, traced from the paper scan: shaft and head, tip at 0,0 */
  var ARROW = '<svg class="bw-arrow__svg" viewBox="-8 -60 196 96" aria-hidden="true">' +
    '<path d="M178 -53C148 -24 92 -6 0 0"/><path d="M56 -39 0 0 53 24"/></svg>';
  function arrow(key) { return '<span class="bw-arrow" data-a="' + key + '">' + ARROW + '<i class="bw-ring" data-a="' + key + 'ring"></i></span>'; }

  function taskCard(g) {
    return '<div class="c bw-task" data-a="taskc" style="width:' + U(g.task.w) + '">' + LIFT +
      '<div class="bw-task__k">' + ic('tasks') + 'Task</div>' +
      '<div class="bw-task__t">Move the west wall</div>' +
      '<div><span class="bw-prio">High priority</span></div>' +
      '<div class="bw-who"><span class="bw-av">JW</span>John Williams</div></div>';
  }

  function markupThumb(g) {
    var t = g.thumb;
    return '<div class="c bw-thumb" data-a="thumb" style="' + at(t[0], t[1], t[2]) + '">' + LIFT +
      '<div class="bw-scan" data-a="scan"><img src="' + A + 'plan.webp" alt="">' +
      '<span class="bw-scan__arrow" data-a="scanarrow">' + ARROW + '</span></div>' +
      '<div class="bw-thumb__t">Paper markup</div>' +
      '<div class="bw-thumb__s"><span class="num">11 Dec 2024</span> · John Williams</div>' +
      '<div class="bw-thumb__s"><i class="bw-dot"></i>Red</div></div>';
  }

  /* a QR-like tile that cannot be scanned: finder squares, no timing or
     format information, modules from a fixed seed */
  function qr() {
    var n = 21, s = '', seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function finder(x, y) { return '<rect x="' + x + '" y="' + y + '" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1" transform="translate(.5 .5) scale(.857)"/>' +
      '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3"/>'; }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var inF = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      if (!inF && rnd() > .55) s += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    return '<svg viewBox="0 0 21 21" aria-hidden="true" shape-rendering="crispEdges">' + s +
      '<path d="M0 0h7v7H0zM1 1v5h5V1zM14 0h7v7h-7zM15 1v5h5V1zM0 14h7v7H0zM1 15v5h5v-5z" fill-rule="evenodd"/>' +
      '<rect x="2" y="2" width="3" height="3"/><rect x="16" y="2" width="3" height="3"/><rect x="2" y="16" width="3" height="3"/></svg>';
  }

  function paper(g) {
    var p = g.paper;
    return '<div class="bw-paper" data-a="paper" style="' + at(p[0], p[1], p[2]) + '">' +
      '<img src="' + A + 'plan.webp" alt="">' +
      '<span class="bw-qr" data-a="qr">' + qr() + '<i class="bw-scanner" data-a="brackets"><b></b><b></b><b></b><b></b></i></span>' +
      '<div class="bw-paper__t num">T1 C3.1 – Level 1 · v2.43.4</div>' +
      '<span class="bw-wm" data-a="wm"><span class="bw-wm__t">Old version</span><span class="bw-wm__v num">v2.43.4</span></span></div>';
  }

  function phone(g) {
    var p = g.phone;
    return '<div class="bw-phone" data-a="phone" style="' + at(p[0], p[1], p[2]) + '">' +
      '<div class="bw-phone__bar"><span>Palo Alto – Level 1' + ic('chev') + '</span>' + ic('gallery') + '</div>' +
      '<div class="bw-vf" data-a="vf"><img src="' + A + 'site-photo.webp" alt=""><i class="bw-flash" data-a="flash"></i></div>' +
      '<div class="bw-cats"><span>Check</span><span class="stack"><span>Progress</span><span class="bw-cat" data-a="cat">Progress</span></span><span>Issue</span></div>' +
      '<span class="bw-shutter" data-a="shutter"></span></div>';
  }

  function toast() {
    return '<div class="bw-toast" data-a="toast"><span class="bw-toast__i">' + ic('check') + '</span>Markup updated</div>';
  }
  function banner() {
    return '<div class="bw-banner" data-a="banner"><span class="bw-banner__i">' + ic('alert') + '</span><div class="bw-banner__t">This is not the latest version</div>' +
      '<span class="bw-banner__b">Go to the latest one</span></div>';
  }

  function stage(g) {
    var fileChip = '<span class="bw-pill bw-file" data-a="file">' + ic('layers') + 'T1 C3.1 – Level 1.pdf</span>';
    /* paint order: the drawing and what is pinned to it; office panels and
       field items over it; then whatever travels, and the task popover */
    return drawingCard(g) + pin('pc', 'comment') + pin('pt', 'task') + pin('pp', 'photo') +
      versionPanel(g) + changesPanel(g) + paper(g) + markupThumb(g) + phone(g) +
      arrow('ar') + '<img class="bw-shot" data-a="shot" src="' + A + 'site-photo.webp" alt="">' + taskCard(g) + fileChip;
  }
  function float(g) {
    var s = g.slot;
    return '<div class="bw-slot" style="left:' + U(s[0]) + ';bottom:' + U(s[1]) + '">' + toast() + banner() + '</div>';
  }

  /* --- choreography ---------------------------------------------------- */
  var ENTER = E.ENTER, EXIT = E.EXIT, TRAVEL = E.TRAVEL, LIN = E.LIN, Track = E.Track;
  var D_IN = E.D_IN, D_OUT = E.D_OUT, D_SAT = E.D_SAT, travelDur = E.travelDur;

  function choreography(q, rect, M) {
    var T = [], g = M ? GEO.m : GEO.d, i;
    function tr(name, keys) { var el = q(name); if (el) T.push(new Track(el, keys)); }
    function fromRight(t0) { return [[t0, { o: 0, x: 16 }], [t0 + D_IN, { o: 1, x: 0 }]]; }
    function toRight(t0) { return [[t0, { o: 1, x: 0 }], [t0 + D_OUT, { o: 0, x: 16 }, EXIT]]; }
    function riseIn(t0, dy) { return [[t0, { o: 0, y: dy || 40 }], [t0 + D_IN, { o: 1, y: 0 }]]; }
    function sinkOut(t0, dy) { return [[t0, { o: 1, y: 0 }], [t0 + D_OUT, { o: 0, y: dy || 40 }, EXIT]]; }
    function toastIn(t0) { return [[t0, { o: 0, y: 12 }], [t0 + D_IN, { o: 1, y: 0 }]]; }
    function toastOut(t0) { return [[t0, { o: 1, y: 0 }], [t0 + D_SAT, { o: 0, y: 8 }, EXIT]]; }
    /* a ring pulses once: on at t0, out and wider over 300 ms */
    function pulse(t0, s1) { return [[t0, { o: 0, s: 1 }], [t0 + .04, { o: .55 }, LIN], [t0 + .3, { o: 0, s: s1 || 1.6 }, TRAVEL]]; }
    function ring(name, t0) { tr(name, [[0, { o: 0, s: 1 }]].concat(pulse(t0))); }

    /* the camera: the plan's framing, and the moves between framings.
       Moves happen only in transitions, 300-900 ms in, with the rail. */
    var MOVES = [[S[1] + .3, 'full', 'west'], [S[2] + .3, 'west', 'full']];
    var camKeys = [[0, ext0(cam(g, 'full'))]];
    function ext0(c) { return { x: c.x, y: c.y, s: c.s }; }
    MOVES.forEach(function (m) { camKeys.push([m[0], ext0(cam(g, m[1]))], [m[0] + .6, ext0(cam(g, m[2])), TRAVEL]); });
    tr('plan', camKeys);
    function camAt(t) {
      var c = cam(g, 'full');
      MOVES.forEach(function (m) { if (t >= m[0] + .6) c = cam(g, m[2]); });
      return c;
    }
    /* An attachment's keys: its own (offsets from its spot, from `from` on)
       merged with the camera's, so it rides every move exactly. The anchor
       is the element's (0,0); CSS centres each attachment on it. */
    function attach(name, p, from, own) {
      var keys = [];
      var base = function (t) { var c = camAt(t), xy = onCard(g, c, p); return { x: xy[0], y: xy[1] }; };
      (own || []).forEach(function (k) {
        var b = base(k[0]), v = {};
        for (var n in k[1]) v[n] = (n === 'x' ? b.x : n === 'y' ? b.y : 0) + k[1][n];
        if (!('x' in v)) v.x = b.x; if (!('y' in v)) v.y = b.y;
        keys.push([k[0], v, k[2]]);
      });
      MOVES.forEach(function (m) {
        if (m[0] < from) return;
        var a = onCard(g, cam(g, m[1]), p), b = onCard(g, cam(g, m[2]), p);
        keys.push([m[0], { x: a[0], y: a[1] }], [m[0] + .6, { x: b[0], y: b[1] }, TRAVEL]);
      });
      tr(name, keys);
    }

    /* rail connectors fill with the camera: same start, duration, ease */
    var switches = [0];
    for (i = 0; i < 3; i++) {
      var t0 = S[i + 1] + .3;
      tr('cn' + i, [[0, { sx: 0 }], [t0, { sx: 0 }], [t0 + .6, { sx: 1 }, TRAVEL]]);
      switches.push(t0 + .3);
    }

    /* captions: out with the stage's panels, in with the next ones */
    for (i = 0; i < 4; i++) {
      var k2 = [];
      if (i > 0) k2.push([0, { o: 0 }], [S[i] + .65, { o: 0, x: 16 }], [S[i] + .65 + D_IN, { o: 1, x: 0 }]);
      if (i < 3) k2.push([S[i + 1] + .15, { o: 1, x: 0 }], [S[i + 1] + .15 + D_SAT, { o: 0, x: -8 }, EXIT]);
      tr('cap' + i, k2);
    }

    /* Stage 1 -- Store ------------------------------------------------ */
    tr('card', [[0, { o: 0, y: 16 }], [.45, { o: 1, y: 0 }]]);
    tr('planimg', [[0, { cp: 0 }], [.7, { cp: 0 }], [1.4, { cp: 1 }, TRAVEL]]);
    /* the file chip glides in from the right and lands on the sheet pill */
    var sheet = rect(q('sheet')), file = q('file');                  /* stage coords are frame coords */
    file.style.left = U(sheet.x); file.style.top = U(sheet.y);
    tr('file', [[0, { o: 0, x: 140 }], [.6, { o: 0, x: 140 }], [.75, { o: 1 }], [1.15, { x: 0 }, TRAVEL], [1.15, { o: 1 }], [1.3, { o: 0 }, LIN]]);
    tr('sheet', [[0, { o: 0 }], [1.15, { o: 0 }], [1.3, { o: 1 }, LIN]]);
    if (!M) tr('vcb', [[0, { o: 0, x: 8 }], [1.2, { o: 0, x: 8 }], [1.2 + D_IN, { o: 1, x: 0 }]]);
    tr('vc', fromRight(1.4).concat(toRight(S[1] + .15)));
    /* the new version slides in on top; the older two shift down one row */
    var shift = rect(q('vr1')).y - rect(q('vr0')).y;
    tr('vr0', [[0, { o: 0, y: -12 }], [1.75, { o: 0, y: -12 }], [2.05, { o: 1, y: 0 }, TRAVEL]]);
    tr('vr1', [[0, { y: -shift }], [1.75, { y: -shift }], [2.05, { y: 0 }, TRAVEL]]);
    tr('vr2', [[0, { y: -shift }], [1.75, { y: -shift }], [2.05, { y: 0 }, TRAVEL]]);
    /* accent: Latest lands with its check drawing on; the node fills */
    tr('ver', [[0, { o: 0 }], [2.4, { o: 0, x: 8 }], [2.4 + D_IN, { o: 1, x: 0 }]]);
    tr('latest', [[0, { o: 0 }], [2.45, { o: 0, x: 8 }], [2.45 + D_IN, { o: 1, x: 0 }]]);
    tr('lcheck', [[0, { dp: 0 }], [2.6, { dp: 0 }], [2.95, { dp: 1 }, TRAVEL]]);
    tr('vnode', [[0, { o: 0, s: .4 }], [2.45, { o: 0, s: .4 }], [2.75, { o: 1, s: 1 }, TRAVEL]]);

    /* Stage 2 -- Collaborate ------------------------------------------ */
    var s2 = S[1];
    tr('tools', [[0, { o: 0, x: -16 }], [s2 + .65, { o: 0, x: -16 }], [s2 + .65 + D_IN, { o: 1, x: 0 }]]);
    /* the comment, then the task: each falls 10 px as its shadow grows */
    [['pc', 'comment', s2 + 1.1], ['pt', 'task', s2 + 1.22]].forEach(function (p) {
      var t1 = p[2];
      attach(p[0], SPOT[p[1]], t1, [[0, { o: 0, y: -10 }], [t1, { o: 0, y: -10 }], [t1 + D_IN, { o: 1, y: 0 }]]);
      tr(p[0] + 'sh', [[0, { s: .4, o: 0 }], [t1, { s: .4, o: 0 }], [t1 + D_IN, { s: 1, o: 1 }]]);
      var tool = p[1] === 'task' ? 'tasks' : 'comment';
      tr('hl-' + tool, [[0, { o: 0 }], [t1 + .3, { o: 0 }], [t1 + .45, { o: 1 }], [t1 + .7, { o: 1 }], [t1 + .85, { o: 0 }, EXIT]]);
    });
    /* the task opens its card, growing from the pin */
    var tc = q('taskc'), tp = onCard(g, cam(g, 'west'), SPOT.task);
    var tAt = g.task.at || [tp[0] + g.task.dx - g.task.w, tp[1] + g.task.dy];   /* desktop: to the pin's left */
    tc.style.left = U(tAt[0]); tc.style.top = U(tAt[1]);
    tc.style.transformOrigin = U(tp[0] - tAt[0]) + ' ' + U(tp[1] - tAt[1]);
    tr('taskc', [[0, { o: 0, s: .96 }], [s2 + 2.1, { o: 0, s: .96 }], [s2 + 2.1 + D_IN, { o: 1, s: 1 }],
                 [S[2], { o: 1, s: 1 }], [S[2] + D_SAT, { o: 0, s: .96 }, EXIT]]);
    /* accent: the paper scan rises, its arrow lifts off and lands on the plan */
    tr('thumb', riseIn(s2 + 3.0, 60).concat(sinkOut(s2 + 3.7, 60)));
    var sa = rect(q('scanarrow')), arS = sa.w / rect(q('ar')).w;
    var lift = s2 + 3.45, land = lift + .6;                         /* once the scan has settled */
    var tip0 = [sa.x + sa.w * 8 / 196, sa.y + sa.h * 60 / 96];       /* the tip: 8/196, 60/96 of the box */
    tr('scanarrow', [[0, { o: 1 }], [lift, { o: 1 }], [lift + .01, { o: 0 }, LIN]]);
    var arLand = onCard(g, cam(g, 'west'), SPOT.arrow);
    attach('ar', SPOT.arrow, land, [[0, { o: 0 }], [lift, { o: 0, x: tip0[0] - arLand[0], y: tip0[1] - arLand[1], s: arS }],
                                   [lift + .01, { o: 1 }, LIN], [land, { x: 0, y: 0, s: 1 }, TRAVEL]]);
    tr('toast', [[0, { o: 0 }]].concat(toastIn(land - .1), toastOut(S[2])));   /* as the arrow settles */

    /* Stage 3 -- Review ----------------------------------------------- */
    var s3 = S[2];
    ['w0', 'w1', 'w2', 'door'].forEach(function (n, k) {
      var t1 = s3 + 1.1 + k * .08;
      tr(n, [[0, { dp: 0, o: 1 }], [t1, { dp: 0 }], [t1 + .45, { dp: 1 }, TRAVEL], [S[3] + .15, { o: 1 }], [S[3] + .4, { o: 0 }, EXIT]]);
    });
    tr('cv', fromRight(s3 + 1.1).concat(toRight(s3 + 2.1)));
    /* the printout rises, a little smaller, over the drawing's lower half */
    tr('paper', riseIn(s3 + 2.3, 80).concat(sinkOut(S[3] + .15, 80)));
    tr('brackets', [[0, { o: 0, s: 1.7 }], [s3 + 2.8, { o: 0, s: 1.7 }], [s3 + 2.85, { o: 1 }, LIN], [s3 + 3.1, { s: 1 }, TRAVEL],
                    [s3 + 3.6, { o: 1 }], [s3 + 3.8, { o: 0 }, EXIT]]);
    /* accent: the watermark, the banner, and the Latest chip answers */
    tr('wm', [[0, { o: 0 }], [s3 + 3.2, { o: 0 }], [s3 + 3.5, { o: 1 }, LIN]]);
    tr('banner', [[0, { o: 0 }]].concat(toastIn(s3 + 3.3), toastOut(S[3])));

    /* Stage 4 -- Report ----------------------------------------------- */
    var s4 = S[3];
    tr('phone', riseIn(s4 + 1.1, 90).concat(sinkOut(s4 + 2.6, 90)));
    tr('shutter', [[0, { s: 1 }], [s4 + 1.75, { s: 1 }], [s4 + 1.81, { s: .86 }, TRAVEL], [s4 + 1.87, { s: 1 }, TRAVEL]]);
    tr('flash', [[0, { o: 0 }], [s4 + 1.87, { o: 0 }], [s4 + 1.91, { o: .4 }, LIN], [s4 + 1.95, { o: 0 }, LIN]]);
    tr('cat', [[0, { o: 0 }], [s4 + 1.95, { o: 0 }], [s4 + 2.1, { o: 1 }, LIN]]);
    /* the photo shrinks out of the viewfinder and lands as a photo pin */
    /* the shot is the viewfinder's own size and shape, centred on the pin's
       spot; it starts over the viewfinder and shrinks uniformly to pin size */
    var vf = rect(q('vf')), shotEl = q('shot'), pinD = rect(q('pp')).w;
    var ppAt = onCard(g, cam(g, 'full'), SPOT.photo);
    shotEl.style.width = U(vf.w); shotEl.style.height = U(vf.h);
    shotEl.style.left = U(ppAt[0]); shotEl.style.top = U(ppAt[1]);
    shotEl.style.marginLeft = U(-vf.w / 2); shotEl.style.marginTop = U(-vf.h / 2);
    var trv = s4 + 2.2, d = .55;
    tr('shot', [[0, { o: 0 }], [trv, { o: 0, x: vf.x + vf.w / 2 - ppAt[0], y: vf.y + vf.h / 2 - ppAt[1], s: 1 }],
                [trv + .01, { o: 1 }, LIN], [trv + d, { x: 0, y: 0, s: pinD / vf.h }, TRAVEL], [trv + d + .12, { o: 0 }, LIN]]);
    attach('pp', SPOT.photo, trv + d, [[0, { o: 0 }], [trv + d - .05, { o: 0 }], [trv + d + .1, { o: 1 }, LIN]]);
    tr('ppsh', [[0, { s: .4, o: 0 }], [trv + d - .05, { s: .4, o: 0 }], [trv + d + .3, { s: 1, o: 1 }]]);

    /* closing beat: every attachment answers once, in order */
    var close = s4 + 4.5;
    ring('pcring', close); ring('ptring', close + .06); ring('arring', close + .12); ring('ppring', close + .18);
    tr('lring', [[0, { o: 0, s: 1 }]].concat(pulse(s3 + 3.45, 1.35), pulse(close + .24, 1.35)));

    return { tracks: T, switches: switches };
  }

  /* --- the promo, as the engine sees it ------------------------------- */
  var PROMO = {
    cls: 'pm--bw', stages: STAGES, captions: CAPTIONS, description: DESCRIPTION, stageW: { d: 600, m: 340 },
    END: END, FRAME_T: FRAME_T, TRANS_IN: TRANS_IN, rail: rail,
    markup: function (mobile) { var g = mobile ? GEO.m : GEO.d; return { stage: stage(g), float: float(g) }; },
    choreography: choreography,
    /* the change counts tick up as the visualizer arrives */
    onSeek: function (t, q) {
      var p = Math.max(0, Math.min(1, (t - (S[2] + 1.3)) / .5)), e = ENTER(p);
      [['ca', 1], ['cr', 0], ['cm', 3]].forEach(function (c) {
        var el = q(c[0]); if (!el) return;
        var txt = String(Math.round(c[1] * e)); if (el.textContent !== txt) el.textContent = txt;
      });
    },
    scrollSync: '.bw-step'
  };

  window.Promo = {
    frame: function (n, opts) { return E.frame(PROMO, n, opts); },
    create: function (mobile) { return E.create(PROMO, mobile); },
    STAGES: STAGES, FRAME_T: FRAME_T, END: END, GEO: GEO, SPOT: SPOT, PLAN: PLAN
  };

  function boot() { var h = document.querySelector('.pmr__vis'); if (h) E.mount(h, PROMO); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
