/* Build Workspace -- the promo: "One wall, Monday to Friday".
 *
 * One architect's change followed through a week on one drawing, T1 C3.1 -
 * Level 1, and one problem on it: the duct the moved wall runs into. Every
 * day acts on that one spot until it is resolved.
 *   Mon  office  Elena moves the west wall 600 mm and uploads v.016; the new
 *                wall draws across the duct.
 *   Tue  site    John pins a photo where wall meets duct; the crossing shows
 *                as a clash, and a task goes to Elena.
 *   Wed  site    John circles the clash in marker on a printout; it is
 *                scanned and vectorized, and becomes keynote 1 on the
 *                drawing, with its note in the sheet's Notes.
 *   Thu  both    Elena issues v.017: the wall comes back 250 mm with an
 *                opening the duct runs through, the clash clears, the task
 *                closes and keynote 1 turns resolved; on site an old print's
 *                QR code is caught as outdated.
 *   Fri  office  The week, clash resolved, becomes a report for the
 *                contractors; the phase completes, next week begins.
 * The clock chip names each day's feature (office · Store, ...).
 *
 * Grammar (deliberately unlike Production Hub's cards and travelling token):
 *   - One drawing fills the frame and one continuous camera moves over it.
 *     Chapters are camera moves, never card swaps.
 *   - UI blooms from the spot it belongs to (scale .94 -> 1 and fade, with
 *     its origin at that spot) and dissolves in place.
 *   - Lines draw on (dp) and comparisons wipe behind a blue divider. Field
 *     things move, never fade: Wednesday's printout rises from below;
 *     Thursday's old prints and the phone come in from the right edge, solid,
 *     and leave the same way.
 *   - Progress is a calendar chip: the week's five days, the selection
 *     sliding to each, and a clock that ticks.
 *   - Look from build.hp.com: HP blue on a pale-blue blueprint, white glass
 *     chips, tight large headlines; CMY accents mark change.
 *
 * Two authored frames share one choreography, sized with container query
 * units:  desktop 600x760 design px (>= 768px), mobile 340x780 (< 768px),
 * the same ratios as Production Hub's.
 * Time, tracks, the rail hook, playback and the QA hook live in the shared
 * engine, work/_shared/promo.js; this file is content only.
 */
(function () {
  'use strict';

  var E = window.PromoEngine;
  var A = '/assets/promo-bw/';
  var STAGES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  var DAYS = [['M', '14', 'Monday', '21'], ['T', '15', 'Tuesday', '22'], ['W', '16', 'Wednesday', '23'], ['T', '17', 'Thursday', '24'], ['F', '18', 'Friday', '25']];   /* this week, and next */
  var FEATURES = ['Store', 'Collaborate', 'Paper markup', 'Review', 'Report'];   /* the days' accessible names */
  var DESCRIPTION = 'One wall, followed through a week on drawing T1 C3.1, Level 1, and the duct it runs into. ' +
    'Monday, in the office, Store: Elena Marsh moves the west wall 600 mm and uploads version 016, which becomes the latest, and shares the drawing with John Williams on site. The new wall now crosses a duct. ' +
    'Tuesday, on site, Collaborate: John pins a photo where the wall meets the duct, the crossing is marked as a clash, and he creates a task, check the duct clearance, assigned to Elena, who is notified and picks it up. ' +
    'Wednesday, on site, Paper markup: John circles the clash in marker on a printout; it is scanned and vectorized, and becomes keynote 1 on the drawing, Duct clash, with a note from his paper markup. ' +
    'Thursday, Review: Elena issues version 017, which brings the wall back 250 mm with an opening for the duct; the comparison shows the change, the clash clears, the task closes and keynote 1 is marked resolved in v.017. On site, an old printout is scanned by its QR code, flagged as outdated, and opened at version 017. ' +
    'Friday, in the office, Report: the week, with the clash resolved, folds into a report sent to three contractors; the Level 1 walls and services phase is marked complete, the next phase, Level 2 ceilings, is lined up, and the calendar rolls on to next week.';

  /* chapter starts, final frames, the closing frame */
  var S = [0, 6.2, 12.6, 18.6, 25.6];
  var END = S[4] + 8.7;                             /* after next week's sheet has slid in and settled */
  var FRAME_T = [6.15, 12.55, 18.55, 25.55, END];
  var NEXT = S[4] + 6.3;                             /* Friday's close: the calendar rolls to next week */
  var TRANS_IN = [null, S[1], S[2], S[3], S[4]];
  /* the clock: from each time on, hh:mm, where, and the day's feature; it
     ticks a minute every 1.5 s */
  var CLOCK = [[0, 9, 12, 'office', 0], [S[1] + .3, 8, 40, 'site', 1], [S[2] + .3, 11, 5, 'site', 2],
               [S[3] + .3, 10, 5, 'office', 3], [S[3] + 3.0, 14, 30, 'site', 3], [S[4] + .3, 16, 56, 'office', 4], [NEXT, 8, 0, 'office', 0]];   /* next week starts again at Store */
  var FEAT_M = ['Store', 'Collab', 'Markup', 'Review', 'Report'];   /* narrow: the chip has room for one short word */

  /* --- icons ----------------------------------------------------------- */
  var ic = E.icons({
    check:  '<path d="M5 12.5 9.8 17 19 7.5"/>',
    office: '<path d="M4.5 20.5h15M6.5 20.5V5.5h8v15M14.5 9.5h3v11M9 8.5h1.5M9 11.5h1.5M9 14.5h1.5"/>',
    site:   '<path d="M4 16.5h16M5.5 16.5a6.5 6.5 0 0 1 13 0M10 10.2V7.5h4v2.7"/>',
    send:   '<path d="M20 4 9.5 14.5M20 4l-6.5 16-4-5.5L4 10.5 20 4Z"/>',
    task:   '<rect x="5" y="5" width="14" height="14" rx="3"/><path d="m8.5 12 2.4 2.4 4.6-4.8"/>',
    plus:   '<path d="M12 5.5v13M5.5 12h13"/>',
    spark:  '<path d="M12 3.5 13.8 9.2 19.5 11 13.8 12.8 12 18.5 10.2 12.8 4.5 11 10.2 9.2Z"/>',
    scan:   '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M4 12h16"/>',
    alert:  '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.6v5.2M12 16.3v.1"/>',
    chev:   '<path d="M9 5.5 15.5 12 9 18.5"/>'
  });
  var U = E.U, at = E.at;

  /* --- the plan ---------------------------------------------------------
     Plan px: the 2328x1608 crop of the clean T1 C3.1 sheet (plan.webp).
     The west wall runs down x 977.5. Monday moves it to 1047.5; Thursday's
     v.017 pulls it back to 1022.5 and opens a door where the duct runs. */
  var PLAN = { w: 2328, h: 1608 };
  var WALL = { x0: 977.5, x1: 1047.5, x2: 1022.5, y0: 292, y1: 1269, door: [700, 790] };
  var DIM = { y: 560, tag: [1012.5, 505], tag2: [1035, 505] };   /* Monday's +600 mm and Thursday's -250 mm */
  /* The duct: a services run starting just east of the old wall, so only the
     moved wall crosses it. Its crossing is the week's one problem. */
  var DUCT = { x0: 1000, x1: 1300, y: 745 };
  var CROSS = [WALL.x1, DUCT.y];
  var PIN = CROSS;                                   /* John's photo pin, on the crossing */
  var MK = CROSS;                                    /* the vectorized loop flies here and becomes keynote 1 */
  var KN_OFF = [-24, -18];                           /* design px: the keynote sits up and left of the crossing, across the wall
                                                        from the pin and its badge, at every zoom */
  var KN_D = 22;                                     /* the keynote's diameter, design px */
  var BADGE = [28, -28];                             /* the task badge on the pin's shoulder, design px from the spot */
  var CMP = [250, 1600];                             /* the comparison sweeps across these plan x */

  /* Layout per frame, design px. card: the drawing in frame coords. pw: the
     plan's width at s = 1, sized so it fills the card's height. cams: the
     plan's translate and scale for each framing; plan px -> card px is
     s * pw / PLAN.w. Everything else is in frame coords. */
  var GEO = {
    d: { W: 600, H: 760, card: [16, 80, 568, 664], pw: 961.3,
         cams: { full: { x: -196.7, y: 0, s: 1 }, west: { x: -157.4, y: -3.1, s: 1.166 }, fri: { x: -270.3, y: 0, s: 1 } },   /* fri: the pins clear of the report */
         ver: [30, 94], hist: [30, 142, 244], share: { right: 30, top: 692 },
         bub: [376, 118, 188], task: [90, 450, 214], pick: [100, 552, 204], cmpc: [30, 698], ph: [30, 692],
         paper: [306, 194, 256, 446], stack: [272, 296, 236, 336], phone: [390, 258, 172], rep: [304, 100, 264], notes: [30, 142, 236], mkW: 64 },
    m: { W: 340, H: 780, card: [12, 76, 316, 420], pw: 608.1,
         cams: { full: { x: -146.1, y: 0, s: 1 }, west: { x: -212.6, y: -54.7, s: 1.448 }, fri: { x: -146.1, y: 0, s: 1 } },
         ver: [24, 88], hist: [12, 510, 316], share: { left: 24, top: 442 },
         bub: [12, 510, 316], task: [12, 628, 316], pick: [36, 600, 260], cmpc: [24, 446], ph: [24, 134],
         paper: [24, 256, 292, 466], stack: [20, 346, 220, 336], phone: [142, 316, 176], rep: [12, 444, 316], notes: [12, 510, 316], mkW: 50, m: true }   /* the report overlaps the sheet so its button stays in frame */
  };
  /* camera moves: [start, from, to, duration] */
  var GLIDE = E.bez(.45, 0, .15, 1, 'cubic-bezier(.45,0,.15,1)');   /* long, unhurried */
  var MOVES = [[.5, 'full', 'west', 1.2], [S[4] + .3, 'west', 'fri', 1.2]];
  function onCard(g, c, p) {
    var k = g.pw / PLAN.w;
    return [g.card[0] + c.x + c.s * k * p[0], g.card[1] + c.y + c.s * k * p[1]];
  }
  function camAt(t) { var c = 'full'; MOVES.forEach(function (m) { if (t >= m[0]) c = m[2]; }); return c; }

  /* --- components ------------------------------------------------------ */
  /* the calendar chip: the week, the selection sliding day to day, a clock */
  function rail(stages) {
    var s = '<div class="pm__rail bw-cal" role="group" aria-label="Week of 14 April">' +
      '<span class="bw-cal__m">Apr</span><span class="bw-cal__days"><i class="bw-cal__sel" data-a="calsel"></i>';
    stages.forEach(function (d, i) {
      s += '<button class="pm__node bw-cal__d" type="button" data-stage="' + i + '" aria-label="' + DAYS[i][2] + ' ' + DAYS[i][1] + ' April: ' + FEATURES[i] + '">' +
        '<span>' + DAYS[i][0] + '</span><span class="stack bw-cal__n"><b class="num" data-a="cda' + i + '">' + DAYS[i][1] + '</b>' +
        '<b class="num" data-a="cdb' + i + '">' + DAYS[i][3] + '</b></span></button>';
    });
    return s + '</span><span class="bw-cal__t"><span class="stack bw-cal__i"><span data-a="ioffice">' + ic('office') + '</span>' +
      '<span data-a="isite">' + ic('site') + '</span></span><span><b class="num" data-a="clock">09:12</b>' +
      '<span class="bw-cal__w"><span data-a="where">office</span> · <span data-a="feat">' + FEATURES[0] + '</span></span>' +
      '<span class="bw-cal__f" data-a="featm">' + FEAT_M[0] + '</span></span></span></div>';
  }

  /* John's mark, in sketch units: one quick marker loop round the duct that
     overshoots its start; vectorized, the same loop smoothed */
  var LOOP_HAND = 'M140 128C124 114 86 116 74 138C62 162 86 186 116 185C146 184 162 162 152 140C146 127 130 121 114 123';
  var LOOP_VEC = 'M112 124C138 124 152 138 152 154C152 171 136 184 112 184C88 184 72 171 72 154C72 138 86 124 112 124Z';
  var LOOP_PTS = [[112, 124], [152, 154], [112, 184], [72, 154]];

  /* v.017's wall: back to x, with an opening the duct runs through; the
     short caps at the opening's ends make it read as a doorway, not a gap */
  function wall17(x) {
    var w = WALL, c = 18;
    return 'M' + x + ' ' + w.y0 + 'V' + w.door[0] + 'M' + x + ' ' + w.door[1] + 'V' + w.y1 +
      'M' + (x - c) + ' ' + w.door[0] + 'H' + (x + c) + 'M' + (x - c) + ' ' + w.door[1] + 'H' + (x + c);
  }
  /* what a print of v.016 shows over the clean sheet: the old wall gone, the
     moved wall, the duct it crosses. Plan coordinates; sized to the print's crop. */
  function printWalls(cls) {
    var w = WALL;
    return '<svg class="bw-pwalls ' + cls + '" data-a="' + cls + '" viewBox="0 0 ' + PLAN.w + ' ' + PLAN.h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="bw-pwalls__erase" d="M' + w.x0 + ' ' + w.y0 + 'V' + w.y1 + '"/>' +
      '<path class="bw-pwalls__wall" d="M' + w.x1 + ' ' + w.y0 + 'V' + w.y1 + '"/>' +
      '<path class="bw-pwalls__duct" d="M' + DUCT.x0 + ' ' + DUCT.y + 'H' + DUCT.x1 + '"/></svg>';
  }

  function sheet(g) {
    var c = g.card, w = WALL, x2 = w.x2;
    return '<div class="bw-sheet" style="' + at(c[0], c[1], c[2], c[3]) + '">' +
      '<div class="bw-plan" data-a="plan" style="width:' + U(g.pw) + ';height:' + U(g.pw * PLAN.h / PLAN.w) + '">' +
      '<img class="bw-plan__img" src="' + A + 'plan.webp" alt="">' +
      '<i class="bw-tint bw-tint--line"></i><i class="bw-tint bw-tint--sheet"></i>' +     /* black lines to blue, white to the sheet */
      '<svg class="bw-walls" viewBox="0 0 ' + PLAN.w + ' ' + PLAN.h + '" aria-hidden="true">' +
      '<path class="bw-erase" data-a="erase" d="M' + w.x0 + ' ' + w.y0 + 'V' + w.y1 + '"/>' +
      '<path class="bw-ghost" data-a="ghost" d="M' + w.x0 + ' ' + w.y0 + 'V' + w.y1 + '"/>' +
      '<path class="bw-wall" data-a="wnew" pathLength="1" d="M' + w.x1 + ' ' + w.y0 + 'V' + w.y1 + '"/>' +
      '<path class="bw-duct" d="M' + DUCT.x0 + ' ' + DUCT.y + 'H' + DUCT.x1 + '"/>' +
      '<path class="bw-clash" data-a="clash" d="M' + (CROSS[0] - 34) + ' ' + DUCT.y + 'H' + (CROSS[0] + 34) + '"/>' +
      '<path class="bw-wall bw-wall--17" data-a="w17" d="' + wall17(x2) + '"/>' +
      '<path class="bw-dimline" data-a="dimline" pathLength="1" d="M' + w.x0 + ' ' + (DIM.y - 18) + 'v36M' + w.x0 + ' ' + DIM.y + 'H' + w.x1 + 'M' + w.x1 + ' ' + (DIM.y - 18) + 'v36"/>' +
      '<path class="bw-dimline" data-a="dimline2" pathLength="1" d="M' + w.x1 + ' ' + (DIM.y - 18) + 'v36M' + w.x1 + ' ' + DIM.y + 'H' + x2 + 'M' + x2 + ' ' + (DIM.y - 18) + 'v36"/>' +
      '</svg>' +
      /* Thursday's comparison: what v.017 removed (magenta) and added (cyan),
         revealed behind the divider; onSeek sets the clip */
      '<svg class="bw-cmp" data-a="cmp" viewBox="0 0 ' + PLAN.w + ' ' + PLAN.h + '" aria-hidden="true">' +
      '<path class="bw-cmp__rem" d="M' + w.x1 + ' ' + w.y0 + 'V' + w.y1 + '"/>' +
      '<path class="bw-cmp__add" d="' + wall17(x2) + '"/></svg>' +
      '<i class="bw-cdiv" data-a="cdiv"></i>' +
      '</div></div>';
  }

  function verChip(g) {
    return '<div class="bw-glass bw-ver" data-a="verc" style="' + at(g.ver[0], g.ver[1]) + '">' +
      '<svg class="bw-ok" viewBox="0 0 24 24" aria-hidden="true"><circle class="bw-ok__ring" cx="12" cy="12" r="9"/>' +
      '<circle class="bw-ok__fill" data-a="vfill" cx="12" cy="12" r="9"/><path class="bw-ok__tick" data-a="vtick" pathLength="1" d="M7.6 12.4 10.7 15.3 16.4 9.2"/></svg>' +
      '<span class="stack bw-roll num"><span data-a="v15">v.015</span><span data-a="v16">v.016</span><span data-a="v17">v.017</span></span>' +
      '<span class="bw-latest" data-a="vlatest">Latest</span></div>';
  }

  var HIST = [['v.016', 'Today, 09:12', 'Moved the west wall 600 mm', 'EM', 'Elena Marsh'],
              ['v.015', '3 Apr', 'Room 4.5 resized for plumbing']];
  function history(g) {
    var h = g.hist;
    return '<div class="bw-glass bw-hist" data-a="hist" style="' + at(h[0], h[1], h[2]) + '">' +
      '<div class="bw-hist__h">Version history<span>' + ic('plus') + 'New</span></div>' +
      '<div class="bw-hist__list"><i class="bw-hist__line"></i>' +
      HIST.map(function (r, i) {
        return '<div class="bw-hrow' + (i === 0 ? ' bw-hrow--now' : '') + '" data-a="hr' + i + '"><i class="bw-hrow__dot"></i>' +
          '<div class="bw-hrow__top"><span class="bw-tag num">' + r[0] + '</span><span class="num">' + r[1] + '</span></div>' +
          '<div class="bw-hrow__n">' + r[2] + '</div>' +
          (r[3] ? '<div class="bw-who"><span class="bw-av">' + r[3] + '</span>' + r[4] + '</div>' : '') + '</div>';
      }).join('') + '</div></div>';
  }

  function share(g) {
    var p = g.share, pos = (p.right != null ? 'right:' + U(p.right) : 'left:' + U(p.left)) + ';top:' + U(p.top);
    return '<div class="bw-glass bw-share" data-a="share" style="' + pos + '"><span class="bw-av bw-av--hp">JW</span>' +
      '<div><div class="bw-share__t">Shared with John Williams</div><div class="bw-share__s">Site · Palo Alto</div></div>' + ic('send') + '</div>';
  }

  function dimTag() { return '<span class="bw-dim" data-a="dim"><span>+600 mm</span></span><span class="bw-dim" data-a="dim2"><span>−250 mm</span></span>'; }

  /* John's pin: a comment bubble with his initials, its one sharp corner on
     the spot; the task badge sits on its shoulder once the task is handed on */
  function pin() {
    return '<span class="bw-ripple" data-a="pinr"><i></i></span>' +
      '<span class="bw-pin" data-a="pin"><b>JW</b></span>' +
      '<span class="bw-tb" data-a="tb"><span>' + ic('task') + '<i class="bw-tb__ok" data-a="tbok">' + ic('check') + '</i></span></span>';
  }

  function bubble(g) {
    var b = g.bub;
    return '<div class="bw-glass bw-bub' + (g.m ? ' bw-bub--row' : '') + '" data-a="bub" style="' + at(b[0], b[1], b[2]) + '">' +
      '<img class="bw-bub__img" src="' + A + 'site-photo.webp" alt="">' +
      '<div class="bw-bub__b"><div class="bw-bub__t">Duct clashes with the new wall</div>' +
      '<div class="bw-who"><span class="bw-av">JW</span>John Williams · <span class="num">08:42</span></div></div></div>';
  }

  function task(g) {
    var t = g.task;
    return '<div class="bw-glass bw-task" data-a="task" style="' + at(t[0], t[1], t[2]) + '">' +
      '<div class="bw-task__k"><i class="bw-box"></i>Task<span class="stack bw-st"><span class="bw-st__todo" data-a="st0">To do</span>' +
      '<span class="bw-st__ip" data-a="st1">In progress</span></span><span class="bw-prio">High</span></div>' +
      '<div class="bw-task__t">Check duct clearance</div>' +
      '<div class="bw-asg"><span class="stack"><span data-a="asg0"><span class="bw-av bw-av--empty" data-a="asgph">+</span>Assign to…</span>' +
      '<span data-a="asg1"><span class="bw-av" data-a="asgav">EM</span>Elena Marsh<span class="bw-notified" data-a="notif">' + ic('check') + 'Notified</span></span></span></div></div>';
  }
  /* who it can go to: a small picker under the assignee row */
  function picker(g) {
    var p = g.pick;
    return '<div class="bw-glass bw-pick" data-a="pick" style="' + at(p[0], p[1], p[2]) + '">' +
      '<div class="bw-pick__r" data-a="pickem"><i class="bw-pick__hl" data-a="pickhl"></i><span class="bw-av">EM</span><div><b>Elena Marsh</b><small>Architect</small></div></div>' +
      '<div class="bw-pick__r"><span class="bw-av bw-av--2">DK</span><div><b>Dana Kim</b><small>MEP engineer</small></div></div></div>';
  }
  /* a fingertip: John is on his phone, so taps, not a cursor */
  function tap() { return '<span class="bw-tap" data-a="tap"><i></i></span>'; }

  /* a QR-like tile that cannot be scanned: finder squares, no timing or
     format information, modules from a fixed seed */
  function qr() {
    var n = 21, s = '', seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var inF = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      if (!inF && rnd() > .55) s += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    return '<svg viewBox="0 0 21 21" aria-hidden="true" shape-rendering="crispEdges">' + s +
      '<path d="M0 0h7v7H0zM1 1v5h5V1zM14 0h7v7h-7zM15 1v5h5V1zM0 14h7v7H0zM1 15v5h5v-5z" fill-rule="evenodd"/>' +
      '<rect x="2" y="2" width="3" height="3"/><rect x="16" y="2" width="3" height="3"/><rect x="2" y="16" width="3" height="3"/></svg>';
  }

  /* Wednesday's printout: John's marker on paper, the scan light, and
     the vectorized layer revealed behind the divider (onSeek sets the clip).
     The sketch and its vector share one viewBox, so they line up exactly. */
  var SK = 'viewBox="0 0 228 300" preserveAspectRatio="xMidYMid meet"';   /* never stretched: a loop stays a loop */
  function paper(g) {
    var p = g.paper;
    var sketch = '<svg class="bw-sketch" ' + SK + ' aria-hidden="true"><g data-a="skg"><path class="bw-pen" data-a="sk0" pathLength="1" d="' + LOOP_HAND + '"/></g></svg>';
    /* vectorized: the loop smoothed, at the same marker weight; handles while it's being made */
    var vector = '<svg class="bw-vecsk" ' + SK + ' aria-hidden="true"><g data-a="vkg"><path class="bw-vloop" data-a="pvloop" d="' + LOOP_VEC + '"/>' +
      LOOP_PTS.map(function (h) { return '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="3.5"/>'; }).join('') + '</g></svg>';
    return '<div class="bw-paper" data-a="paper" style="' + at(p[0], p[1], p[2], p[3]) + '">' +
      '<div class="bw-paper__top"><span class="num">T1 C3.1 – Level 1 · v.016</span><span class="bw-paper__qr">' + qr() + '</span></div>' +
      '<div class="bw-print"><div class="bw-print__img"></div>' + printWalls('pw0') + sketch +
      '<div class="bw-print__vec" data-a="pvec"><div class="bw-print__img"></div><i class="bw-tint bw-tint--line"></i><i class="bw-tint bw-tint--sheet"></i>' + printWalls('pw1') + vector + '</div>' +
      '<i class="bw-pdiv" data-a="pdiv"></i><i class="bw-pscan" data-a="pscan"></i></div>' +
      '<span class="bw-glass bw-pchip"><span class="stack"><span data-a="pc1">' + ic('scan') + 'Scanned · HP DesignJet</span>' +
      '<span data-a="pc2">' + ic('spark') + 'AI Vectorize</span></span></span></div>';
  }

  /* the loop that lands on the plan, centred on the element's (0,0): the
     smoothed loop moved to the origin (80 x 60), plus 4 units for the stroke */
  /* keynote 1: the drawing's own note symbol, centred on its (0,0); green
     once v.017 resolves it */
  function knSym(cls, ok) {
    return '<span class="bw-kn' + (cls ? ' ' + cls : '') + '"><b>1</b><i class="bw-kn__ok" data-a="' + ok + '"><b>1</b></i></span>';
  }
  function keynote() { return '<span class="bw-knw" data-a="kn">' + knSym('', 'knok') + '</span>'; }
  /* the sheet's Notes: part of the drawing, not a chip */
  function notes(g) {
    var n = g.notes;
    return '<div class="bw-notes" data-a="notes" style="' + at(n[0], n[1], n[2]) + '"><div class="bw-notes__h">Notes</div>' +
      '<div class="bw-nrow" data-a="nrow">' + knSym('bw-kn--s', 'nkok') +
      '<div><div class="bw-nrow__t">Duct clash</div><div class="bw-nrow__s">Paper markup · JW · <span class="num">16/04</span></div></div>' +
      '<span class="bw-nrow__ok" data-a="nok">' + ic('check') + '<span class="num">v.017</span></span></div></div>';
  }

  function mark() {
    return '<span class="bw-ripple" data-a="mkr"><i></i></span>' +
      '<span class="bw-mk" data-a="mk"><svg viewBox="-4 -4 88 68" aria-hidden="true">' +
      '<path d="M40 0C66 0 80 14 80 30C80 47 64 60 40 60C16 60 0 47 0 30C0 14 14 0 40 0Z"/></svg></span>';
  }

  /* Thursday's comparison chip */
  function cmpChip(g) {
    return '<div class="bw-glass bw-cmpc" data-a="cmpc" style="' + at(g.cmpc[0], g.cmpc[1]) + '">' +
      '<span class="bw-cmpc__k"><i class="bw-dot bw-dot--rem"></i><span class="num">v.016</span></span>' +
      '<span class="bw-cmpc__k"><i class="bw-dot bw-dot--add"></i><span class="num">v.017</span> · opening for duct</span></div>';
  }

  /* Thursday on site: a stack of old prints and the phone that checks one */
  function stack(g) {
    var s = g.stack;
    return '<div class="bw-stack" data-a="stack" style="' + at(s[0], s[1], s[2], s[3]) + '"><i></i><i></i>' +
      '<div class="bw-stack__top"><div class="bw-print__img"></div><span class="bw-stack__qr">' + qr() + '</span>' +
      '<span class="bw-stack__v num">v.016</span></div></div>';
  }
  function phone(g) {
    var p = g.phone;
    return '<div class="bw-phone" data-a="phone" style="' + at(p[0], p[1], p[2]) + '"><div class="bw-phone__scr">' +
      '<div class="bw-phone__bar">Scan a print</div>' +
      '<div class="bw-vf"><div class="bw-print__img bw-vf__cam"></div><i class="bw-vf__frost"></i><span class="bw-vf__qr">' + qr() + '</span><i class="bw-brk" data-a="brk"><b></b><b></b><b></b><b></b></i></div>' +
      '<div class="bw-res bw-res--bad" data-a="qbad"><span class="bw-res__i">' + ic('alert') + '</span>' +
      '<div class="bw-res__t">This print is outdated</div><div class="bw-res__s num">Printed v.016 · Latest v.017</div>' +
      '<span class="bw-btn" data-a="qbtn">Open v.017</span></div>' +
      '<div class="bw-res bw-res--ok" data-a="qok"><span class="bw-res__i">' + ic('check') + '</span>' +
      '<div class="bw-res__t">Now on v.017</div><div class="bw-res__s">Opening for duct</div></div>' +
      '</div></div>';
  }

  /* Friday: the week, as a report */
  var REP = [['Versions', 'v.016 · v.017'], ['Site photos', '1'], ['Markups from paper', '1'], ['Clash', 'resolved'], ['Prints checked', '1']];
  function report(g) {
    var r = g.rep;
    return '<div class="bw-glass bw-rep" data-a="rep" style="' + at(r[0], r[1], r[2]) + '">' +
      '<div class="bw-rep__h"><div><div class="bw-rep__t">Weekly report</div><div class="bw-rep__s">Level 1 · <span class="num">14–18 Apr</span></div></div>' +
      '<span class="bw-rep__pdf">PDF</span></div>' +
      REP.map(function (x, i) {
        return '<div class="bw-rrow" data-a="rr' + i + '"><span>' + x[0] + '</span><span class="num">' +
          (i === 3 ? '<svg class="bw-rtick" viewBox="0 0 24 24" aria-hidden="true"><path data-a="rtick" pathLength="1" d="M5 12.5 9.8 17 19 7.5"/></svg>' : '') + x[1] + '</span></div>';
      }).join('') +
      '<div class="bw-rto"><span>To</span><span class="bw-rto__av"><b data-a="ra0">DP</b><b data-a="ra1">KE</b><b data-a="ra2">ND</b></span>' +
      '<span>Level 1 contractors</span></div>' +
      /* the same slide-to-confirm as Production Hub's "Drag to mark done" */
      '<div class="bw-slide" data-a="rslide"><span class="bw-knob" data-a="rknob">' + ic('send') + '<span class="bw-knob__ok" data-a="rknobok">' + ic('check') + '</span></span>' +
      '<span class="bw-slide__l" data-a="rsl">Slide to send<span class="bw-slide__chev">' + ic('chev') + ic('chev') + ic('chev') + '</span></span>' +
      '<span class="bw-slide__done" data-a="rsd">Sent · <span class="num">Fri 17:00</span></span></div></div>';
  }
  /* the phase: done, and what's next */
  function phase(g) {
    var p = g.ph;
    return '<div class="bw-glass bw-ph" data-a="ph" style="' + at(p[0], p[1]) + '">' +
      '<span class="stack bw-ph__l"><span data-a="ph0">Level 1 · Walls &amp; MEP</span><span data-a="ph1">Next → Level 2 · Ceilings</span></span>' +
      '<span class="bw-ph__bar"><i data-a="phfill"></i></span>' +
      '<span class="stack bw-ph__s"><span class="num" data-a="phs0">80%</span><span class="bw-ph__ok" data-a="phs1">' + ic('check') + 'Complete</span>' +
      '<span class="num" data-a="phs2">Mon 21</span></span></div>';
  }

  /* Next week: Level 2's reflected ceiling plan, a fresh sheet. The same
     building, the plan mirrored so it reads as another floor, with a 600 mm
     ceiling grid and its lights in the main rooms, and a new version chip.
     Nothing pinned, nothing noted: a fresh start. Plan px, like the walls. */
  var RCP = [[0, 320, 960, 1077], [1640, 553, 2163, 1086], [1756, 310, 2163, 533]];   /* x0, y0, x1, y1 */
  function ceiling() {
    var grid = '', lights = '', T = 70;
    RCP.forEach(function (r) {
      for (var x = r[0]; x <= r[2]; x += T) grid += 'M' + x + ' ' + r[1] + 'V' + r[3];
      for (var y = r[1]; y <= r[3]; y += T) grid += 'M' + r[0] + ' ' + y + 'H' + r[2];
      for (var lx = r[0] + T * 1.5; lx < r[2]; lx += T * 3) for (var ly = r[1] + T * 1.5; ly < r[3]; ly += T * 3)
        lights += '<circle cx="' + lx + '" cy="' + ly + '" r="16"/>';
    });
    return '<svg class="bw-rcp" viewBox="0 0 ' + PLAN.w + ' ' + PLAN.h + '" aria-hidden="true"><path d="' + grid + '"/><g>' + lights + '</g></svg>';
  }
  function sheet2(g) {
    var c = g.card, cam = g.cams.full;
    return '<div class="bw-sheet bw-sheet2" data-a="sheet2" style="' + at(c[0], c[1], c[2], c[3]) + '">' +
      '<div class="bw-plan" style="left:' + U(cam.x) + ';top:' + U(cam.y) + ';width:' + U(g.pw) + ';height:' + U(g.pw * PLAN.h / PLAN.w) + '">' +
      '<div class="bw-flip"><img class="bw-plan__img" src="' + A + 'plan.webp" alt=""><i class="bw-tint bw-tint--line"></i><i class="bw-tint bw-tint--sheet"></i>' +
      '<i class="bw-tint bw-veil"></i>' + ceiling() + '</div></div>' +
      '<div class="bw-glass bw-ver" style="' + at(g.ver[0] - c[0], g.ver[1] - c[1]) + '">' +
      '<svg class="bw-ok" viewBox="0 0 24 24" aria-hidden="true"><circle class="bw-ok__ring" cx="12" cy="12" r="9"/></svg>' +
      '<span>Level 2 · Ceilings</span><span class="bw-ver2__v num">v.001</span></div></div>';
  }

  function stage(g) {
    /* paint order: the drawing and what lives in its space; the chips over
       it; the printout, then the vector that leaves it (so it travels over
       the paper); Thursday's prints and phone over everything on the plan;
       the report last */
    return sheet(g) + dimTag() + pin() + verChip(g) + history(g) + share(g) +
      bubble(g) + task(g) + picker(g) + cmpChip(g) + notes(g) + keynote() + paper(g) + mark() + stack(g) + phone(g) + phase(g) + report(g) + sheet2(g) + tap();
  }

  /* --- choreography ---------------------------------------------------- */
  var ENTER = E.ENTER, EXIT = E.EXIT, TRAVEL = E.TRAVEL, LIN = E.LIN, Track = E.Track;
  var D_IN = E.D_IN, D_SAT = E.D_SAT;
  var SETTLE = E.bez(.34, 1.4, .64, 1, 'cubic-bezier(.34,1.4,.64,1)');   /* a small overshoot, then rest */

  function choreography(q, rect, M) {
    var T = [], g = M ? GEO.m : GEO.d, i;
    function tr(name, keys) { var el = q(name); if (el) T.push(new Track(el, keys)); }
    /* bloom in place / dissolve in place / rise from below / sink back */
    function bloom(t0) { return [[0, { o: 0, s: .94 }], [t0, { o: 0, s: .94 }], [t0 + D_IN, { o: 1, s: 1 }]]; }
    function dissolve(t0) { return [[t0, { o: 1, s: 1 }], [t0 + .25, { o: 0, s: .98 }, EXIT]]; }
    function rise(t0, dy) { return [[0, { o: 0, y: dy }], [t0, { o: 0, y: dy }], [t0 + .55, { o: 1, y: 0 }]]; }
    function sink(t0, dy) { return [[t0, { o: 1, y: 0 }], [t0 + .3, { o: 0, y: dy }, EXIT]]; }
    function fadeIn(t0, d) { return [[0, { o: 0 }], [t0, { o: 0 }], [t0 + (d || .25), { o: 1 }]]; }
    function fadeOut(t0, d) { return [[t0, { o: 1 }], [t0 + (d || .25), { o: 0 }]]; }
    function origin(el, p) { var r = rect(el); el.style.transformOrigin = U(p[0] - r.x) + ' ' + U(p[1] - r.y); }

    /* the camera, and plan-space elements riding it */
    var C = g.cams, ck = [[0, { x: C.full.x, y: C.full.y, s: C.full.s }]];
    MOVES.forEach(function (m) {
      ck.push([m[0], { x: C[m[1]].x, y: C[m[1]].y, s: C[m[1]].s }], [m[0] + m[3], { x: C[m[2]].x, y: C[m[2]].y, s: C[m[2]].s }, GLIDE]);
    });
    tr('plan', ck);
    /* An attachment's (0,0) rides the camera through every move. Its own keys
       give x / y as offsets from its spot at that moment (a travel or a drop),
       plus whatever opacity or scale it needs. */
    /* off: a constant offset in design px (a badge beside its spot keeps its
       distance at every zoom) */
    function attach(name, p, own, off) {
      var keys = [], o = off || [0, 0];
      function at2(c) { var xy = onCard(g, c, p); return [xy[0] + o[0], xy[1] + o[1]]; }
      (own || []).forEach(function (k) {
        var b = at2(C[camAt(k[0])]), v = {};
        for (var n in k[1]) v[n] = n === 'x' ? b[0] + k[1][n] : n === 'y' ? b[1] + k[1][n] : k[1][n];
        keys.push([k[0], v, k[2]]);
      });
      var a0 = at2(C.full), fill = {};
      if (!keys.some(function (k) { return 'x' in k[1]; })) fill.x = a0[0];
      if (!keys.some(function (k) { return 'y' in k[1]; })) fill.y = a0[1];
      keys.push([0, fill]);
      MOVES.forEach(function (m) {
        var a = at2(C[m[1]]), b = at2(C[m[2]]);
        keys.push([m[0], { x: a[0], y: a[1] }], [m[0] + m[3], { x: b[0], y: b[1] }, GLIDE]);
      });
      tr(name, keys);
    }
    function ripple(name, p, times, off) {
      var k = [[0, { o: 0, s: .3 }]];
      /* held at nothing until each ring fires, or it would fade up all along */
      times.forEach(function (t0) { k.push([t0 - .01, { o: 0, s: .3 }], [t0, { o: .55 }, LIN], [t0 + .55, { o: 0, s: 1.7 }, TRAVEL]); });
      attach(name, p, k, off);
    }

    /* the calendar: the selection slides to each day as it begins */
    var cells = Array.prototype.slice.call(q('calsel').parentNode.querySelectorAll('.bw-cal__d'));
    var step = rect(cells[1]).x - rect(cells[0]).x, sel = [[0, { x: 0 }]], switches = [0];
    for (i = 1; i < 5; i++) {
      var t0 = S[i] + .3;
      sel.push([t0, { x: (i - 1) * step }], [t0 + .45, { x: i * step }, TRAVEL]);
      switches.push(t0 + .2);
    }
    sel.push([NEXT, { x: 4 * step }], [NEXT + .5, { x: 0 }, TRAVEL]);   /* Friday's close: back to Monday, next week */
    tr('calsel', sel);
    for (i = 0; i < 5; i++) {
      var tn = NEXT + i * .05;
      tr('cda' + i, [[0, { o: 1, y: 0 }], [tn, { o: 1, y: 0 }], [tn + .3, { o: 0, y: -14 }, TRAVEL]]);
      tr('cdb' + i, [[0, { o: 0, y: 14 }], [tn, { o: 0, y: 14 }], [tn + .3, { o: 1, y: 0 }, TRAVEL]]);
    }
    /* the clock's office / site glyph follows the clock */
    var ko = [[0, { o: 1 }]], ks = [[0, { o: 0 }]];
    CLOCK.forEach(function (c, n) {
      if (!n) return;
      var site = c[3] === 'site', was = CLOCK[n - 1][3] === 'site';
      if (site === was) return;
      ko.push([c[0], { o: site ? 1 : 0 }], [c[0] + .2, { o: site ? 0 : 1 }]);
      ks.push([c[0], { o: site ? 0 : 1 }], [c[0] + .2, { o: site ? 1 : 0 }]);
    });
    tr('ioffice', ko); tr('isite', ks);

    /* Monday -- Store ------------------------------------------------- */
    /* the camera glides to the west wall (0.5-1.7); the old wall lifts out
       as a dashed ghost and the new one draws in 600 mm east */
    tr('erase', fadeIn(1.8, .3));
    tr('ghost', fadeIn(1.8, .3).concat(fadeOut(S[1])));
    tr('wnew', [[0, { dp: 0, o: 1 }], [2.0, { dp: 0 }], [2.65, { dp: 1 }, TRAVEL], [S[3] + 2.0, { o: 1 }], [S[3] + 2.2, { o: 0 }]]);
    tr('dimline', [[0, { dp: 0, o: 1 }], [2.5, { dp: 0 }], [2.9, { dp: 1 }, TRAVEL], [S[1], { o: 1 }], [S[1] + .25, { o: 0 }]]);
    attach('dim', DIM.tag, bloom(2.7).concat(dissolve(S[1])));
    /* the version rolls to v.016 (and Thursday to v.017); the check fills
       and draws; Latest lands, and answers again on Thursday */
    tr('v15', [[0, { o: 1, y: 0 }], [3.0, { o: 1, y: 0 }], [3.3, { o: 0, y: -12 }, TRAVEL]]);
    tr('v16', [[0, { o: 0, y: 12 }], [3.0, { o: 0, y: 12 }], [3.3, { o: 1, y: 0 }, TRAVEL],
               [S[3] + .5, { o: 1, y: 0 }], [S[3] + .8, { o: 0, y: -12 }, TRAVEL]]);
    tr('v17', [[0, { o: 0, y: 12 }], [S[3] + .5, { o: 0, y: 12 }], [S[3] + .8, { o: 1, y: 0 }, TRAVEL]]);
    tr('vfill', fadeIn(3.1, .2));
    tr('vtick', [[0, { dp: 0 }], [3.25, { dp: 0 }], [3.55, { dp: 1 }, TRAVEL]]);
    tr('vlatest', [[0, { o: 0, x: -6, s: 1 }], [3.35, { o: 0, x: -6 }], [3.35 + D_IN, { o: 1, x: 0 }],
                   [S[3] + .55, { s: 1 }], [S[3] + .8, { s: 1.12 }, ENTER], [S[3] + 1.05, { s: 1 }, EXIT]]);
    /* the history blooms from the chip, its rows settling in order */
    var vc = rect(q('verc'));
    origin(q('hist'), [vc.x + 20, vc.y + vc.h / 2]);
    tr('hist', bloom(3.5).concat(dissolve(S[1])));
    for (i = 0; i < HIST.length; i++) tr('hr' + i, [[0, { o: 0, y: 6 }], [3.65 + i * .1, { o: 0, y: 6 }], [3.65 + i * .1 + D_IN, { o: 1, y: 0 }]]);
    /* and it goes to site */
    tr('share', [[0, { o: 0, y: 8 }], [4.6, { o: 0, y: 8 }], [4.6 + D_IN, { o: 1, y: 0 }]].concat(dissolve(S[1] + .05)));

    /* Tuesday -- the pin -------------------------------------------- */
    var s1 = S[1], pinAt = onCard(g, C.west, PIN);
    /* John's pin grows out of its corner where wall meets duct; a ripple marks
       the spot, and the crossing shows as a clash until v.017 clears it */
    attach('pin', PIN, [[0, { o: 0, s: .6 }], [s1 + .7, { o: 0, s: .6 }], [s1 + .8, { o: 1 }, LIN], [s1 + 1.15, { s: 1 }, SETTLE]]);
    tr('clash', fadeIn(s1 + 1.0, .3).concat(fadeOut(S[3] + 2.0, .3)));
    ripple('pinr', PIN, [s1 + 1.1]);
    /* his photo blooms out of the pin */
    origin(q('bub'), [pinAt[0] + 15, pinAt[1] - 15]);
    tr('bub', bloom(s1 + 1.45).concat(dissolve(S[2])));
    /* the task blooms beside the pin; John taps "Assign to…", the picker
       opens, he taps Elena; she's notified and picks it up */
    var tk = rect(q('task')), tko = M ? [tk.x + tk.w / 2, tk.y] : [tk.x + tk.w, tk.y + 14];
    origin(q('task'), tko);
    var pk = rect(q('pick'));
    origin(q('pick'), M ? [pk.x + 24, pk.y + pk.h] : [pk.x + 24, pk.y]);   /* opens down; on mobile, up */
    tr('pick', bloom(s1 + 2.7).concat(dissolve(s1 + 3.3)));
    tr('pickhl', fadeIn(s1 + 3.15, .1));
    tr('asg0', [[0, { o: 1, y: 0 }], [s1 + 3.3, { o: 1, y: 0 }], [s1 + 3.5, { o: 0, y: -8 }, TRAVEL]]);
    tr('asg1', [[0, { o: 0, y: 8 }], [s1 + 3.3, { o: 0, y: 8 }], [s1 + 3.5, { o: 1, y: 0 }, TRAVEL]]);
    tr('asgav', [[0, { s: .5 }], [s1 + 3.35, { s: .5 }], [s1 + 3.7, { s: 1 }, SETTLE]]);
    tr('notif', [[0, { o: 0, x: -4 }], [s1 + 3.6, { o: 0, x: -4 }], [s1 + 3.6 + D_IN, { o: 1, x: 0 }]]);
    tr('st0', [[0, { o: 1, y: 0 }], [s1 + 4.0, { o: 1, y: 0 }], [s1 + 4.3, { o: 0, y: -10 }, TRAVEL]]);
    tr('st1', [[0, { o: 0, y: 10 }], [s1 + 4.0, { o: 0, y: 10 }], [s1 + 4.3, { o: 1, y: 0 }, TRAVEL]]);
    /* the next day: the card folds into the pin and leaves a task badge on
       its shoulder; Thursday's v.017 ticks it done */
    var bAt = [pinAt[0] + BADGE[0], pinAt[1] + BADGE[1]];
    tr('task', bloom(s1 + 2.0).concat([[S[2], { o: 1, s: 1, x: 0, y: 0 }],
      [S[2] + .45, { o: 0, s: .15, x: bAt[0] - tko[0], y: bAt[1] - tko[1] }, TRAVEL]]));
    attach('tb', PIN, [[0, { o: 0, s: .4 }], [S[2] + .3, { o: 0, s: .4 }], [S[2] + .4, { o: 1 }, LIN], [S[2] + .65, { s: 1 }, SETTLE]], BADGE);
    tr('tbok', fadeIn(S[3] + 2.0, .2));   /* with the clash clearing: v.017 closes it */
    tr('knok', fadeIn(S[3] + 2.0, .25));  /* and keynote 1 turns resolved, on the drawing and in the Notes */
    tr('nkok', fadeIn(S[3] + 2.0, .25));
    tr('nok', [[0, { o: 0, x: -4 }], [S[3] + 2.0, { o: 0, x: -4 }], [S[3] + 2.0 + D_IN, { o: 1, x: 0 }]]);
    /* the fingertip: two taps here, one on Friday's send */
    function center(el) { var r = rect(el); return [r.x + r.w / 2, r.y + r.h / 2]; }
    var taps = [[s1 + 2.6, center(q('asgph'))], [s1 + 3.1, center(q('pickem'))]];
    var tp = [[0, { o: 0, s: .6, x: taps[0][1][0], y: taps[0][1][1] }]];
    taps.forEach(function (k) {
      /* it stays where it pressed until it has faded, then moves on unseen */
      tp.push([k[0] - .01, { o: 0, s: .6, x: k[1][0], y: k[1][1] }], [k[0] + .08, { o: .6, s: 1 }, LIN],
              [k[0] + .42, { o: 0, s: 1.5, x: k[1][0], y: k[1][1] }, TRAVEL]);
    });
    tr('tap', tp);

    /* Wednesday -- paper comes back --------------------------------- */
    var s2 = S[2];
    /* The print shows the sheet cropped as .bw-print__img's background
       (42% 44% / 320% wide); size the v.016 walls to that crop, and move
       John's loop (sketch units, centred near 112,154) onto the crossing. */
    var prt = rect(q('pscan').parentNode), bw = prt.w * 3.2, bh = bw * PLAN.h / PLAN.w;
    var bx = (prt.w - bw) * .42, by = (prt.h - bh) * .44;
    ['pw0', 'pw1'].forEach(function (k) { var e = q(k); e.style.left = U(bx); e.style.top = U(by); e.style.width = U(bw); e.style.height = U(bh); });
    var cx = bx + CROSS[0] / PLAN.w * bw, cy = by + CROSS[1] / PLAN.h * bh;
    var sk = Math.min(prt.w / 228, prt.h / 300), skx = (cx - (prt.w - 228 * sk) / 2) / sk, sky = (cy - (prt.h - 300 * sk) / 2) / sk;
    ['skg', 'vkg'].forEach(function (k) { q(k).setAttribute('transform', 'translate(' + (skx - 112).toFixed(1) + ' ' + (sky - 154).toFixed(1) + ')'); });
    tr('paper', rise(s2 + .45, 60).concat(sink(s2 + 4.4, 60)));
    /* John's marker loop draws on, one stroke */
    tr('sk0', [[0, { dp: 0 }], [s2 + 1.1, { dp: 0 }], [s2 + 1.75, { dp: 1 }, TRAVEL]]);
    /* the scan light passes; the chip says what happened, then what's next */
    var pr = rect(q('pscan').parentNode);
    tr('pscan', [[0, { o: 0, y: 0 }], [s2 + 2.2, { o: 0, y: 0 }], [s2 + 2.3, { o: 1 }, LIN], [s2 + 2.85, { y: pr.h }, TRAVEL], [s2 + 2.95, { o: 0 }, LIN]]);
    tr('pc1', [[0, { o: 0, y: 6 }], [s2 + 2.2, { o: 0, y: 6 }], [s2 + 2.45, { o: 1, y: 0 }], [s2 + 3.0, { o: 1, y: 0 }], [s2 + 3.2, { o: 0, y: -8 }, TRAVEL]]);
    tr('pc2', [[0, { o: 0, y: 8 }], [s2 + 3.0, { o: 0, y: 8 }], [s2 + 3.2, { o: 1, y: 0 }, TRAVEL]]);
    /* AI Vectorize: the divider sweeps, leaving a crisp layer behind it */
    tr('pdiv', fadeIn(s2 + 3.0, .1).concat(fadeOut(s2 + 3.75, .15)));
    /* the vector loop lifts off the paper and lands on the drawing beside
       the pin, centre to centre, scaled from the paper's size to the plan's
       (the plan's loop is 80 of its 88 viewBox units wide) */
    var lift = s2 + 3.9, land = lift + .6, va = rect(q('pvloop'));
    var c0 = [va.x + va.w / 2, va.y + va.h / 2];
    tr('vkg', [[0, { o: 1 }], [lift, { o: 1 }], [lift + .01, { o: 0 }, LIN]]);   /* the loop and its handles leave together */
    /* ...and shrinks into keynote 1 as it arrives: the drawn shape becomes
       the drawing's symbol, and its note is written into the sheet's Notes */
    var mkAt = onCard(g, C.west, MK), loopW = g.mkW * 80 / 88;
    mkAt = [mkAt[0] + KN_OFF[0], mkAt[1] + KN_OFF[1]];
    attach('mk', MK, [[0, { o: 0 }], [lift, { o: 0, x: c0[0] - mkAt[0], y: c0[1] - mkAt[1], s: va.w / loopW }],
                      [lift + .01, { o: 1 }, LIN], [land - .15, { o: 1 }], [land, { x: 0, y: 0, s: KN_D / loopW, o: 0 }, TRAVEL]], KN_OFF);
    attach('kn', MK, [[0, { o: 0, s: .6 }], [land - .15, { o: 0, s: .6 }], [land - .05, { o: 1 }, LIN], [land + .25, { s: 1 }, SETTLE]], KN_OFF);
    ripple('mkr', MK, [land], KN_OFF);
    tr('notes', bloom(land + .2).concat(M ? [[NEXT, { x: 0 }], [NEXT + .5, { x: -g.W }, EXIT]] : []));   /* narrow: it sits below the sheet, so it leaves */
    tr('nrow', [[0, { o: 0, y: 6 }], [land + .35, { o: 0, y: 6 }], [land + .35 + D_IN, { o: 1, y: 0 }]]);

    /* Thursday -- what moved, and an old print ---------------------- */
    var s3 = S[3];
    /* v.017 (rolled above); the divider sweeps and the changes are left
       glowing: magenta where the wall was, cyan where it now stands */
    tr('cmp', fadeIn(s3 + 1.0, .1).concat(fadeOut(s3 + 3.0)));
    tr('cdiv', fadeIn(s3 + .95, .15).concat(fadeOut(s3 + 2.0, .2)));
    tr('w17', fadeIn(s3 + 2.0, .25));
    tr('cmpc', bloom(s3 + 2.1).concat(dissolve(s3 + 3.0)));
    /* how far it came back: Monday's tag, answered */
    tr('dimline2', [[0, { dp: 0, o: 1 }], [s3 + 2.0, { dp: 0 }], [s3 + 2.3, { dp: 1 }, TRAVEL], [s3 + 3.0, { o: 1 }], [s3 + 3.25, { o: 0 }]]);
    attach('dim2', DIM.tag2, bloom(s3 + 2.15).concat(dissolve(s3 + 3.0)));
    /* on site: the prints, then the phone, come in from the right edge (the
       frame clips them until then), the brackets lock on the code; on Friday
       they leave the way they came, phone first. Solid all the way: no fade. */
    function slideIn(t0, dx) { return [[0, { o: 1, x: dx }], [t0, { x: dx }], [t0 + .6, { x: 0 }, ENTER]]; }
    function slideOut(t0, dx) { return [[t0, { x: 0 }], [t0 + .45, { x: dx }, EXIT]]; }
    var offS = g.W - g.stack[0] + 40, offP = g.W - g.phone[0] + 40;   /* far enough that the shadow is out too */
    tr('stack', slideIn(s3 + 3.15, offS).concat(slideOut(S[4] + .05, offS)));
    tr('phone', slideIn(s3 + 3.3, offP).concat(slideOut(S[4], offP)));
    tr('brk', [[0, { o: 0, s: 1.3 }], [s3 + 3.9, { o: 0, s: 1.3 }], [s3 + 3.95, { o: 1 }, LIN], [s3 + 4.25, { s: 1 }, TRAVEL]]);
    /* outdated; the button presses; up to date */
    tr('qbad', [[0, { o: 0, y: 24 }], [s3 + 4.45, { o: 0, y: 24 }], [s3 + 4.45 + D_IN, { o: 1, y: 0 }], [s3 + 5.35, { o: 1 }], [s3 + 5.55, { o: 0 }]]);
    tr('qbtn', [[0, { s: 1 }], [s3 + 5.1, { s: 1 }], [s3 + 5.18, { s: .94 }, TRAVEL], [s3 + 5.28, { s: 1 }, TRAVEL]]);
    tr('qok', [[0, { o: 0, s: .96 }], [s3 + 5.35, { o: 0, s: .96 }], [s3 + 5.35 + D_IN, { o: 1, s: 1 }]]);

    /* Friday -- the report ------------------------------------------ */
    var s4 = S[4];
    /* the camera pulls back (above), and the week folds into the report */
    origin(q('rep'), [g.rep[0] + g.rep[2] / 2, g.rep[1] + 40]);
    /* next week: on mobile the report sits below the sheet, so it leaves to
       the left as Level 2's sheet comes in from the right; on desktop the
       new sheet simply covers Level 1 and everything on it */
    tr('rep', bloom(s4 + 2.0).concat(M ? [[NEXT, { x: 0 }], [NEXT + .5, { x: -g.W }, EXIT]] : []));
    tr('sheet2', [[0, { o: 1, x: g.W - g.card[0] + 40 }], [NEXT + .1, { x: g.W - g.card[0] + 40 }], [NEXT + .85, { x: 0 }, TRAVEL]]);
    for (i = 0; i < REP.length; i++) tr('rr' + i, [[0, { o: 0, y: 6 }], [s4 + 2.2 + i * .1, { o: 0, y: 6 }], [s4 + 2.2 + i * .1 + D_IN, { o: 1, y: 0 }]]);
    tr('rtick', [[0, { dp: 0 }], [s4 + 2.85, { dp: 0 }], [s4 + 3.15, { dp: 1 }, TRAVEL]]);
    /* tap send: the three contractors pop in, and it's sent */
    /* slide to send: the knob crosses, dragging the label away; it lands as
       a green check, it's sent, and the three contractors pop in */
    var kn0 = s4 + 3.0, knTravel = rect(q('rslide')).w - 12 - 40;
    tr('rknob', [[kn0, { x: 0 }], [kn0 + .7, { x: knTravel }, TRAVEL]]);
    tr('rsl', [[kn0 + .1, { o: 1 }], [kn0 + .4, { o: 0 }, LIN]]);
    tr('rknobok', [[kn0 + .7, { o: 0 }], [kn0 + .9, { o: 1 }]]);
    tr('rsd', [[kn0 + .7, { o: 0, x: -8 }], [kn0 + .7 + D_IN, { o: 1, x: 0 }]]);
    for (i = 0; i < 3; i++) tr('ra' + i, [[0, { o: 0, s: .5 }], [kn0 + .75 + i * .08, { o: 0, s: .5 }], [kn0 + .85 + i * .08, { o: 1 }, LIN], [kn0 + 1.15 + i * .08, { s: 1 }, SETTLE]]);
    /* the phase completes, then names what's next */
    tr('ph', bloom(s4 + 4.4));
    tr('phfill', [[0, { sx: .8 }], [s4 + 4.65, { sx: .8 }], [s4 + 5.15, { sx: 1 }, TRAVEL], [s4 + 5.8, { sx: 1 }], [s4 + 6.1, { sx: 0 }, TRAVEL]]);
    tr('phs0', [[0, { o: 1, y: 0 }], [s4 + 5.1, { o: 1, y: 0 }], [s4 + 5.35, { o: 0, y: -10 }, TRAVEL]]);
    tr('phs1', [[0, { o: 0, y: 10 }], [s4 + 5.1, { o: 0, y: 10 }], [s4 + 5.35, { o: 1, y: 0 }, TRAVEL], [s4 + 5.8, { o: 1, y: 0 }], [s4 + 6.05, { o: 0, y: -10 }, TRAVEL]]);
    tr('phs2', [[0, { o: 0, y: 10 }], [s4 + 5.8, { o: 0, y: 10 }], [s4 + 6.05, { o: 1, y: 0 }, TRAVEL]]);
    tr('ph0', [[0, { o: 1, y: 0 }], [s4 + 5.8, { o: 1, y: 0 }], [s4 + 6.05, { o: 0, y: -10 }, TRAVEL]]);
    tr('ph1', [[0, { o: 0, y: 10 }], [s4 + 5.8, { o: 0, y: 10 }], [s4 + 6.05, { o: 1, y: 0 }, TRAVEL]]);
    /* and the calendar rolls on to next week (with the selection, above) */

    return { tracks: T, switches: switches };
  }

  /* --- the promo, as the engine sees it ------------------------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  var PROMO = {
    cls: 'pm--bw', stages: STAGES, captions: [],   /* no headlines: the calendar and the drawing carry each day */
    description: DESCRIPTION, stageW: { d: 600, m: 340 },
    END: END, FRAME_T: FRAME_T, TRANS_IN: TRANS_IN, rail: rail,
    markup: function (mobile) { return { stage: stage(mobile ? GEO.m : GEO.d), float: '' }; },
    choreography: choreography,
    /* per frame: the clock ticks, and the two wipes follow their dividers */
    onSeek: function (t, q) {
      var c = CLOCK[0];
      for (var i = 1; i < CLOCK.length; i++) if (t >= CLOCK[i][0]) c = CLOCK[i];
      var m = c[1] * 60 + c[2] + Math.floor(Math.max(0, t - c[0]) / 1.5), txt = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
      var el = q('clock'); if (el && el.textContent !== txt) el.textContent = txt;
      var w = q('where'); if (w && w.textContent !== c[3]) w.textContent = c[3];
      var f = q('feat'); if (f && f.textContent !== FEATURES[c[4]]) f.textContent = FEATURES[c[4]];
      var fm = q('featm'); if (fm && fm.textContent !== FEAT_M[c[4]]) fm.textContent = FEAT_M[c[4]];
      /* the engine keeps Friday as the current day; next week, Monday is */
      var cs = q('calsel'), nx = t >= NEXT + .2;
      if (cs) { var cal = cs.parentNode.parentNode; if (cal.hasAttribute('data-next') !== nx) { if (nx) cal.setAttribute('data-next', ''); else cal.removeAttribute('data-next'); } }
      /* Wednesday: the vector layer, left of the divider */
      var pv = TRAVEL(clamp01((t - (S[2] + 3.05)) / .7));
      var vec = q('pvec'), pd = q('pdiv');
      if (vec) vec.style.clipPath = 'inset(0 ' + ((1 - pv) * 100).toFixed(2) + '% 0 0)';
      if (pd) pd.style.left = (pv * 100).toFixed(2) + '%';
      /* Thursday: the changes, left of the divider, in plan x */
      var pc = TRAVEL(clamp01((t - (S[3] + 1.0)) / 1.0)), x = CMP[0] + pc * (CMP[1] - CMP[0]);
      var cmp = q('cmp'), cd = q('cdiv');
      if (cmp) cmp.style.clipPath = 'inset(0 ' + ((1 - x / PLAN.w) * 100).toFixed(2) + '% 0 0)';
      if (cd) cd.style.left = (x / PLAN.w * 100).toFixed(2) + '%';
    }
  };

  window.Promo = {
    frame: function (n, opts) { return E.frame(PROMO, n, opts); },
    create: function (mobile) { return E.create(PROMO, mobile); },
    STAGES: STAGES, FRAME_T: FRAME_T, END: END, GEO: GEO, PLAN: PLAN
  };

  function boot() { var h = document.querySelector('.pmr__vis'); if (h) E.mount(h, PROMO); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
