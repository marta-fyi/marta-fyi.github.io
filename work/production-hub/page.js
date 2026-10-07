/* Production Hub -- the promo: one order, #39208, through four teams.
 *
 * One master timeline in real seconds, played once: Accounts, Production,
 * Operations, Shipping, ending on Shipping's final frame with Replay. The
 * timeline is a pure function of time: seek(t) writes every element's
 * transform and opacity for that instant and nothing else, so playing,
 * jumping, replaying and reduced motion are all just seek().
 *
 * Grammar:
 *   - Only the order token travels between stages: artwork (3:4), mint bar
 *     and #39208, always the same size, moved by translation alone. Cards
 *     never morph; they exit and enter around the token.
 *   - Every stage change is the same 1.1 s: satellites out (0-180 ms),
 *     primary card out to the left (150-400), token travels with the rail in
 *     sync (300-850), next card in from the right (650-1100).
 *   - Tokens: enter 450 ms cubic-bezier(.22,1,.36,1) + 16 px; exit 250 ms
 *     (satellites 180) cubic-bezier(.55,0,1,.45); travel
 *     cubic-bezier(.65,0,.35,1) at 300/450/550 ms by distance.
 *   - Holds of 1.5 s on each stage's final frame, 2 s on the last.
 *
 * Two authored frames share one choreography, both sized with container
 * query units (no transform scaling, so text renders crisp):
 *   desktop  600x760 design px (>= 768px)
 *   mobile   340x780 design px, the same story laid out narrow (< 768px)
 *
 * Geometry is kept in design px; the engine converts to CSS px at draw time.
 * Time, tracks, the rail, playback and the QA hook (window.__promo) live in
 * the shared engine, tools/shared/promo.js; this file is content only.
 */
(function () {
  'use strict';

  var A = '/assets/promo/';
  var END = 21.55;
  var FRAME_T = [6.45, 11.55, 16.4, 21.5];        /* each stage's final frame */
  var TRANS_IN = [null, 6.5, 11.6, 16.45];        /* start of the transition into each stage */
  var STAGE_W = { d: 568, m: 316 };               /* design width of the white stage */
  var STAGES = ['Accounts', 'Production', 'Operations', 'Shipping'];
  var CAPTIONS = ['Files, quote and payment', 'Fits into the gaps',
                  'Plans change, the order adapts', 'Shipped and tracked'];
  var DESCRIPTION = 'One order, #39208, moving through four teams. ' +
    'Accounts: the client uploads AW_Campaign_2024.AI, the €580,00 quote is sent, accepted by John Walters and paid by credit card, and the order is queued. ' +
    'Production: in a schedule already full of other orders, it finds a free slot on Printer 2 and the next free slot on Cutter 1 right after it, and splits into a print job and a cutting job that fill them. ' +
    'Operations: the due date moves from 23/04/2024 to 22/04/2024 to make the carrier pickup, and the task is marked done. ' +
    'Shipping: the order is printed, shipped on 22/04/2024 at 17:56 from Sant Cugat with Seur, and tracked to delivery on 23/04/2024.';

  /* --- icons ----------------------------------------------------------- */
  var ICONS = {
    close:  '<path d="M6 6l12 12M18 6 6 18"/>',
    check:  '<path d="M5 12.5 9.8 17 19 7.5"/>',
    checkc: '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.5 2.4 4.9-5"/>',
    upload: '<path d="M12 15V4.5M8 8.5l4-4 4 4"/><path d="M4.5 14v3.5A2 2 0 0 0 6.5 19.5h11a2 2 0 0 0 2-2V14"/>',
    fileup: '<path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5l-5-5Z"/><path d="M13.5 3.5v5h5M12 17.5v-6M9.5 14l2.5-2.5 2.5 2.5"/>',
    quote:  '<path d="M6.5 3.5h11v17l-2.2-1.5-2.1 1.5-2.2-1.5-2.2 1.5-2.3-1.5V3.5Z"/><path d="M9.5 8h5M9.5 11.5h5M9.5 15h3"/>',
    pin:    '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    bell:   '<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z"/><path d="M10 18.5a2.2 2.2 0 0 0 4 0"/>',
    assign: '<circle cx="9.5" cy="7.5" r="3.5"/><path d="M3 20c0-3.3 2.9-6 6.5-6 1 0 2 .2 2.8.6"/><circle cx="17.5" cy="16.5" r="4.5"/><path d="M17.5 14.5v4M15.5 16.5h4"/>',
    pencil: '<path d="M4 20h4L19.3 8.7a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M15.5 6.5 17.5 8.5"/>',
    calalert:'<rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4M12 13v3"/><circle cx="12" cy="18" r=".6" fill="currentColor" stroke="none"/>',
    caltoday:'<rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4"/><rect x="7.5" y="13" width="3" height="3" rx=".6"/>',
    cal:    '<rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4"/>',
    chev:   '<path d="M9 5.5 15.5 12 9 18.5"/>',
    dots:   '<circle cx="12" cy="5.5" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.35" fill="currentColor" stroke="none"/>',
    pause:  '<path d="M9 6v12M15 6v12"/>',
    play:   '<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>'
  };
  var E = window.PromoEngine;
  var ic = E.icons(ICONS), U = E.U, at = E.at, ext = E.ext, LIFT = E.LIFT;

  /* --- components ------------------------------------------------------ */
  function slot(key, extra) { return '<span class="slot' + (extra ? ' ' + extra : '') + '" data-a="' + key + '"></span>'; }

  function uploadCard(x, y, w, M) {
    var row = M
      ? '<p class="frow__n" style="margin-bottom:' + U(8) + '">AW_Campaign_2024.AI</p><div class="frow">' + slot('slot-up') +
        '<p class="frow__s num">21,3 MB</p><span class="pc" data-a="pcheck">' + ic('check') + '</span></div>'
      : '<div class="frow">' + slot('slot-up') + '<div><p class="frow__n">AW_Campaign_2024.AI</p><p class="frow__s num">21,3 MB</p></div>' +
        '<span class="pc" data-a="pcheck">' + ic('check') + '</span></div>';
    return '<div class="c" data-a="up" style="' + at(x, y, w) + '">' + LIFT +
      '<div class="ch"><span class="ch__tile">' + ic('upload') + '</span><p class="ch__t">Upload files</p>' +
      '<span style="font-size:' + U(13) + ';color:var(--grey)">#39208</span>' + ic('close', 'ch__x') + '</div>' +
      '<div class="drop"' + (M ? ' style="height:' + U(124) + ';padding:0 ' + U(16) + ';text-align:center"' : '') + '><span class="drop__i" data-a="dropi">' + ic('fileup') + '</span>' +
      '<p>Drag &amp; drop your files here or <a>choose file</a></p><p style="font-size:' + U(12) + ';color:var(--grey)">500 MB max file size.</p></div>' +
      '<div style="margin-top:' + U(16) + '">' + row + '<div class="prog"><i data-a="pfill"></i></div></div>' +
      '</div>';
  }
  function dropPill() {
    return '<span class="fpill at" data-a="pill" style="gap:' + U(8) + ';padding-left:' + U(4) + '">' + LIFT +
      '<img src="' + A + 'art-39208.webp" alt="" style="width:' + U(16) + ';height:' + U(22) + ';object-fit:cover;border-radius:' + U(4) + '">AW_Campaign_2024.AI</span>';
  }

  function orderCard(x, y, w, M) {
    return '<div class="c" data-a="order" style="' + at(x, y, w) + '">' + LIFT +
      '<div class="ch"><p class="ch__t">Order details</p><span class="pill pill--mint" data-a="queued">Queued</span></div>' +
      '<div class="fr"><span>Client</span><span>Brownie</span></div>' +
      '<div class="fr"><span>Order ID</span><span>#39208</span></div>' +
      '<div class="fr"><span>Job type</span><span>Banner</span></div>' +
      '<div class="fr"><span>Priority</span><span><span class="pill pill--coral">High</span></span></div>' +
      '<div class="hr"></div><div class="frow">' + slot('slot-order') +
      '<p class="frow__s num">21,3 MB</p></div>' +   /* the name was shown on upload; the quote overlaps here */
      '</div>';
  }

  function quoteCard(x, y, w, M) {
    var lines = [[M ? 'Print <em>× 10</em>' : 'Print · NEPTUNE_Vinyl_345x543 <em>× 10</em>', '€420,00'],
                 ['Lamination <em>× 10</em>', '€90,00'], ['Cutting', '€45,00'], ['Packaging', '€25,00']];
    return '<div class="c" data-a="quote" style="' + at(x, y, w) + ';padding:' + U(18) + ' ' + U(16) + '">' + LIFT +
      '<div class="ch"><span class="ch__tile">' + ic('quote') + '</span><p class="ch__t">Quote</p>' +
      '<span class="stack" style="overflow:hidden"><span class="pill pill--sent" data-a="sent">Sent</span><span class="pill pill--mint" data-a="accepted">Accepted</span></span></div>' +
      '<p class="qby" data-a="qby">Accepted by John Walters</p>' +
      lines.map(function (l, i) { return '<div class="ql" data-a="ql' + i + '"><span>' + l[0] + '</span><span class="num">' + l[1] + '</span></div>'; }).join('') +
      '<div class="qt" data-a="qt"><span>Total</span><span class="num" data-a="total">€580,00</span></div>' +
      '<div class="chips" style="margin-top:' + U(16) + '"><span class="chip">PayPal</span>' +
      '<span class="stack"><span class="chip">Credit card</span><span class="chip chip--on" data-a="cardon">Credit card' + ic('checkc') + '</span></span>' +
      (M ? '' : '<span class="chip">Wire transfer</span>') + '</div>' +
      '</div>';
  }

  function toast(key, x, y, w, kind, title, sub) {
    return '<div class="toast" data-a="' + key + '" style="' + at(x, y, w) + '">' +
      '<span class="toast__i toast__i--' + kind + '">' + ic(kind === 'ok' ? 'check' : 'bell') + '</span>' +
      '<div><p class="toast__t">' + title + '</p><p class="toast__s">' + sub + '</p></div>' + ic('close', 'ch__x') + '</div>';
  }

  /* a job card: an order, or one part of it, on the schedule */
  function job(o) {
    return '<div class="job' + (o.cls ? ' ' + o.cls : '') + '"' + (o.a ? ' data-a="' + o.a + '"' : '') +
      ' style="' + at(o.x, o.y, o.w, o.h) + '">' + LIFT +
      '<span class="job__bar" style="background:var(--o-' + o.order + ')"></span>' +
      (o.noArt ? '' : '<img class="job__art" src="' + A + 'art-' + o.order + '.webp" alt="">') +
      '<div class="job__b"><p class="job__id">' + o.id + '</p>' + (o.nm ? '<p class="job__nm">' + o.nm + '</p>' : '') + '</div></div>';
  }

  /* --- the schedule: Printer 1, Printer 2, Cutter 1, 09:00-12:00 ------- */
  var GEO = {
    d: { laneX: [70, 230, 390], laneW: 154, t0: 192, pxH: 132, headY: 96, gridX: 64, gridW: 484, tickX: 20, pillX: 12, bottom: 604, chip: [20, 16] },
    m: { laneX: [52, 140, 228], laneW: 84, t0: 182, pxH: 136, headY: 86, gridX: 46, gridW: 266, tickX: 2, pillX: 0, bottom: 606, chip: [12, 12], m: true }
  };
  function ty(g, hhmm) { var p = hhmm.split(':'); return g.t0 + ((+p[0] - 9) + (+p[1]) / 60) * g.pxH; }
  function lane(g, l, from, to) {
    var y = ty(g, from) + 2, pad = g.m ? 2 : 4;
    return { x: g.laneX[l] + pad, y: y, w: g.laneW - pad * 2, h: ty(g, to) - 2 - y };
  }
  /* an empty slot the order can take: dashed mint outline in the lane */
  function gap(g, l, from, to, key) { var r = lane(g, l, from, to); return '<span class="gap" data-a="' + key + '" style="' + at(r.x, r.y, r.w, r.h) + '"></span>'; }
  var STATIONS = [['Printer 1', 'HP Latex 800W', 'printer'], ['Printer 2', 'HP Latex 800W', 'printer'], ['Cutter 1', 'CutterX 231M', 'cutter']];

  function schedule(g) {
    var s = '', narrow = g.m ? { cls: 'job--m', noArt: true } : {};
    ['09:00', '10:00', '11:00', '12:00'].forEach(function (t) {
      s += '<span class="tick num" style="' + at(g.tickX, ty(g, t)) + '">' + t + '</span>' +
           '<span class="grid" style="' + at(g.gridX, ty(g, t), g.gridW) + '"></span>';
    });
    g.laneX.forEach(function (x) { s += '<span class="lane" style="' + at(x - (g.m ? 2 : 3), g.t0 - 16, null, g.bottom - g.t0) + '"></span>'; });
    /* a full day: the other two orders each print, then cut, on every machine.
       The only room is Printer 2 09:45-10:45 and Cutter 1 straight after. */
    [[0, '09:00', '10:15', '98410', 'Print'], [0, '10:15', '12:00', '618716', 'Print'],
     [1, '09:00', '09:45', '618716', 'Print'], [1, '10:45', '12:00', '98410', 'Print'],
     [2, '09:45', '10:45', '618716', 'Cutting'], [2, '11:30', '12:00', '98410', 'Cutting']].forEach(function (j) {
      s += job(ext(ext(lane(g, j[0], j[1], j[2]), { order: j[3], id: '#' + j[3], nm: j[4] }), narrow));
    });
    s += gap(g, 1, '09:45', '10:45', 'gap1') + gap(g, 2, '10:45', '11:30', 'gap2');
    s += job(ext(ext(lane(g, 1, '09:45', '10:45'), { order: '39208', id: '#39208-01', nm: 'Print', a: 'p1' }), narrow));
    s += job(ext(ext(lane(g, 2, '10:45', '11:30'), { order: '39208', id: '#39208-02', nm: 'Cutting', a: 'p2' }), narrow));
    /* headers after the parts: a part passes under its station on the way into the lane */
    STATIONS.forEach(function (st, i) {
      s += '<div class="st' + (g.m ? ' st--m' : '') + '" style="' + at(g.laneX[i], g.headY, g.laneW) + '"><img src="' + A + 'station-' + st[2] + '.webp" alt="">' +
        '<div><p class="st__n">' + st[0] + '</p>' + (g.m ? '' : '<p class="st__m">' + st[1] + '</p>') + '</div>' +
        (i === 2 ? '<span class="st__ring" data-a="ring"></span>' : '') + '</div>';
    });
    var y = ty(g, '11:24');
    s += '<div data-a="now" style="position:absolute;inset:0"><span class="now" style="' + at(g.gridX, y, g.gridW) + '"></span>' +
         '<span class="tpill num" style="' + at(g.pillX, y) + '">11:24</span></div>';
    s += slot('slot-sched', 'slot--ghost" style="' + at(g.chip[0], g.chip[1]));
    return '<div data-a="sched" style="position:absolute;inset:0">' + s + '</div>';
  }

  function doneCard(x, y, w) {
    return '<div class="done" data-a="done" style="' + at(x, y, w) + '">' + LIFT +
      slot('slot-done') + '<span class="done__dots" data-a="dots">' + ic('dots') + '</span>' +
      '<p class="done__nm" style="margin-top:' + U(14) + '">Akatsuki Asuma Mogato</p><p class="done__sp">NEPTUNE_Vinyl_345x543</p>' +
      '<span class="due">' + ic('cal') + '<span class="stack num" style="overflow:hidden"><span data-a="due23">Due 23/04/2024</span><span data-a="due22">Due 22/04/2024</span></span></span>' +
      '<div class="slide" data-a="slide"><span class="knob" data-a="knob">' + ic('check') + '<span class="knob--ok" data-a="knobok">' + ic('check') + '</span></span>' +
      'Drag to mark done<span class="slide__chev">' + ic('chev') + ic('chev') + ic('chev') + '</span></div></div>';
  }

  function taskMenu(x, y, w) {
    var rows = [['assign', 'Assign'], ['pencil', 'Reminder notification'], ['calalert', 'Due date', 1], ['caltoday', 'Due date to today']];
    return '<div class="c menu" data-a="menu" style="' + at(x, y, w) + '">' + LIFT +
      '<div class="ch"><p class="ch__t">Task actions</p>' + ic('close', 'ch__x') + '</div>' +
      rows.map(function (r) {
        return '<div class="mi">' + (r[2] ? '<span class="mi__hl" data-a="duehl"></span>' : '') + '<span class="mi__i">' + ic(r[0]) + '</span><span>' + r[1] + '</span></div>';
      }).join('') + '</div>';
  }

  function commentRow(x, y, w) {
    return '<div class="c cmt" data-a="cmt" style="' + at(x, y, w) + '">' + LIFT +
      '<img src="' + A + 'face-amelie.webp" alt=""><div><p class="cmt__n">Amélie Laurent<span class="cmt__t">1 minute ago</span></p>' +
      '<p class="cmt__b">Due date moved to 22/04 to make the carrier pickup.</p></div></div>';
  }

  var TRACK = [['Ordered', '19/04/2024', '12:23'], ['Printed', '21/04/2024', '16:31'], ['Shipped', '22/04/2024', '17:56'], ['Estimated delivery', '23/04/2024']];
  function trackingCard(x, y, w) {
    var pos = [0, 100 / 3, 200 / 3, 100];
    var nodes = pos.map(function (p, i) {
      return '<span class="trk__n" style="left:' + p + '%"></span>' +
        (i < 3 ? '<span class="trk__n trk__n--on" data-a="tn' + i + '" style="left:' + p + '%">' + ic('check') + '</span>' : '');
    }).join('');
    var labels = TRACK.map(function (l, i) {
      var align = i === 0 ? 'left:0' : i === 3 ? 'right:0;text-align:right' : 'left:' + pos[i] + '%;transform:translateX(-50%);text-align:center';
      return '<div class="trk__l" style="' + align + '"><p>' + l[0] + '</p><p class="num"' + (i < 3 ? ' data-a="td' + i + '"' : '') + '>' +
        l[1] + (l[2] ? '<br>' + l[2] : '') + '</p></div>';
    }).join('');
    return '<div class="c" data-a="track" style="' + at(x, y, w) + ';padding:' + U(20) + ' ' + U(24) + ' ' + U(22) + '">' + LIFT +
      slot('slot-track', 'slot--ghost" style="left:' + U(-10) + ';top:' + U(-36)) +
      '<div class="ch" style="margin-left:' + U(104) + ';margin-bottom:' + U(22) + '"><span class="ch__tile">' + ic('pin') + '</span><p class="ch__t">Tracking</p></div>' +
      '<div class="trk"><i class="trk__fill" data-a="tfill"></i>' + nodes + '</div>' +
      '<div class="trk__labels">' + labels + '</div>' +
      '<p class="upd__h">Updates</p>' +
      '<div class="upd"><span class="h">Date</span><span class="h">Location</span><span class="h">Event</span>' +
      '<span class="r num" data-a="ur0">22/04/2024 - 17:56</span><span class="r" data-a="ur1">Sant Cugat, ES</span>' +
      '<span class="r" data-a="ur2"><span class="ev">Shipped</span><br>Carrier: Seur</span></div>' +
      '</div>';
  }
  /* the same card, narrow: the tracker runs down instead of across */
  function trackingCardNarrow(x, y, w) {
    var rows = TRACK.map(function (l, i) {
      return '<div class="vrow"><span class="trk__n"></span>' +
        (i < 3 ? '<span class="trk__n trk__n--on" data-a="tn' + i + '">' + ic('check') + '</span>' : '') +
        '<p>' + l[0] + '</p><p class="vrow__d num"' + (i < 3 ? ' data-a="td' + i + '"' : '') + '>' + l[1] + (l[2] ? '<br>' + l[2] : '') + '</p></div>';
    }).join('');
    return '<div class="c" data-a="track" style="' + at(x, y, w) + '">' + LIFT +
      slot('slot-track', 'slot--ghost" style="left:' + U(-8) + ';top:' + U(-36)) +
      '<div class="ch" style="margin-left:' + U(116) + ';margin-bottom:' + U(18) + '"><span class="ch__tile">' + ic('pin') + '</span><p class="ch__t">Tracking</p></div>' +
      '<div class="vtrk"><span class="vtrk__bar"><i class="vtrk__fill" data-a="vfill"></i></span>' + rows + '</div>' +
      '<p class="upd__h" style="margin-top:' + U(14) + '">Updates</p>' +
      '<div class="upd upd--2"><span class="h">Date</span><span class="h">Event</span>' +
      '<span class="r num" data-a="ur0">22/04/2024 - 17:56<br>Sant Cugat, ES</span>' +
      '<span class="r" data-a="ur1"><span class="ev">Shipped</span><br>Carrier: Seur</span></div>' +
      '</div>';
  }

  function token() {
    return '<div class="tokn" data-a="token"><i class="pm-lift" data-a="tokl"></i><span class="job__bar"></span>' +
      '<img src="' + A + 'art-39208.webp" alt=""><p class="num">#39208</p></div>';
  }

  /* --- the two stages -------------------------------------------------- */
  function desktopStage() {
    return uploadCard(60, 70, 448) + dropPill() +
      orderCard(20, 24, 296) + quoteCard(240, 232, 308) +
      schedule(GEO.d) +
      doneCard(24, 40, 276) + taskMenu(312, 56, 240) + commentRow(24, 352, 524) +
      trackingCard(20, 128, 528) + token();
  }
  /* notifications float over the stage's bottom-left corner, unclipped */
  function desktopFloat() {
    return toast('t1', -12, 582, 360, 'req', 'New request for approval', 'Sent by Account Manager') +
      toast('t2', -12, 582, 360, 'ok', 'Order #39208 Shipped', 'Sent by Production Manager');
  }
  function mobileStage() {
    return uploadCard(12, 24, 292, true) + dropPill() +
      orderCard(12, 12, 292, true) + quoteCard(24, 300, 280, true) +
      schedule(GEO.m) +
      doneCard(12, 12, 292) + taskMenu(12, 320, 292) + commentRow(12, 320, 292) +
      trackingCardNarrow(12, 58, 292) + token();
  }
  function mobileFloat() {
    return toast('t1', -6, 600, 300, 'req', 'New request for approval', 'Sent by Account Manager') +
      toast('t2', -6, 600, 300, 'ok', 'Order #39208 Shipped', 'Sent by Production Manager');
  }

  /* --- motion, from the engine --------------------------------------- */
  var ENTER = E.ENTER, EXIT = E.EXIT, TRAVEL = E.TRAVEL, LIN = E.LIN, Track = E.Track;
  var D_IN = E.D_IN, D_OUT = E.D_OUT, D_SAT = E.D_SAT, travelDur = E.travelDur;

  /* --- choreography ---------------------------------------------------- */
  function choreography(q, rect, M) {
    var T = [], g = M ? GEO.m : GEO.d, i;
    function tr(name, keys) { var el = q(name); if (el) T.push(new Track(el, keys)); }
    /* card in from the right / out to the left, satellites out quicker */
    function cardIn(t0) { return [[t0, { o: 0, x: 16 }], [t0 + D_IN, { o: 1, x: 0 }]]; }
    function cardOut(t0, d) { return [[t0, { o: 1, x: 0 }], [t0 + (d || D_OUT), { o: 0, x: -16 }, EXIT]]; }
    function satOut(t0) { return [[t0, { o: 1, x: 0 }], [t0 + D_SAT, { o: 0, x: -12 }, EXIT]]; }
    function toastIn(t0) { return [[t0, { o: 0, y: 12 }], [t0 + D_IN, { o: 1, y: 0 }]]; }
    function toastOut(t0) { return [[t0, { o: 1, y: 0 }], [t0 + D_SAT, { o: 0, y: 8 }, EXIT]]; }

    /* layout-dependent positions, design px */
    var dropi = rect(q('dropi')), pill = q('pill'), pillW = rect(pill).w;
    var pillAt = M ? [dropi.x + dropi.w / 2 - pillW / 2, dropi.y + dropi.h / 2 - 15] : [dropi.x + dropi.w + 12, dropi.y + dropi.h / 2 - 15];
    pill.style.left = U(pillAt[0]); pill.style.top = U(pillAt[1]);
    var pillFrom = M ? { x: 0, y: 250 } : { x: 30, y: 200 };
    var S = {};
    ['slot-up', 'slot-order', 'slot-sched', 'slot-done', 'slot-track'].forEach(function (k) { S[k] = rect(q(k)); });
    var travel = rect(q('slide')).w - 12 - 44;

    /* the token: translation only, between slots. Each trip also moves the
       rail when it is a stage change, with the same start, duration, ease. */
    var tk = [[0, { o: 0, x: S['slot-up'].x, y: S['slot-up'].y }], [.9, { o: 0 }], [1.1, { o: 1 }]];
    var rl = [[0, { sx: 0 }]], switches = [0], tl = [[0, { o: 0 }]];
    function trip(t0, from, to, railTo) {
      var d = travelDur(Math.hypot(S[to].x - S[from].x, S[to].y - S[from].y));
      tk.push([t0, { x: S[from].x, y: S[from].y }], [t0 + d, { x: S[to].x, y: S[to].y }, TRAVEL]);
      tl.push([t0, { o: 0 }], [t0 + .12, { o: 1 }], [t0 + d - .12, { o: 1 }], [t0 + d, { o: 0 }]);
      if (railTo != null) { rl.push([t0, { sx: railTo - 1 / 3 }], [t0 + d, { sx: railTo }, TRAVEL]); switches.push(t0 + d / 2); }
      return d;
    }

    /* Stage 1 -- Accounts. The first frame is drawn before play: no entrance. */
    tr('up', cardOut(2.1));
    tr('pill', [[0, { x: pillFrom.x, y: pillFrom.y, l: 0 }], [.45, { x: pillFrom.x, y: pillFrom.y, l: 0 }], [.65, { l: 1 }],
                [1.0, { x: 0, y: 0, l: 0 }, TRAVEL], [1.0, { o: 1 }], [1.0 + D_SAT, { o: 0 }, EXIT]]);
    tr('pfill', [[1.0, { sx: 0 }], [1.8, { sx: 1 }, TRAVEL]]);
    tr('pcheck', [[1.8, { o: 0, x: 8 }], [1.8 + D_IN, { o: 1, x: 0 }]]);
    trip(2.25, 'slot-up', 'slot-order');
    tr('order', cardIn(2.35).concat(cardOut(6.7)));
    tr('quote', cardIn(3.0).concat(satOut(6.5)));
    for (i = 0; i < 4; i++) tr('ql' + i, [[3.1 + i * .08, { o: 0, x: 8 }], [3.1 + i * .08 + D_IN, { o: 1, x: 0 }]]);
    tr('qt', [[3.3, { o: 0, x: 8 }], [3.3 + D_IN, { o: 1, x: 0 }]]);
    /* accent: Sent rolls up to Accepted as Credit card selects */
    tr('sent', [[4.1, { o: 1, y: 0 }], [4.3, { o: 0, y: -10 }, EXIT]]);
    tr('accepted', [[4.1, { o: 0, y: 10 }], [4.3, { o: 1, y: 0 }]]);
    tr('cardon', [[4.1, { o: 0 }], [4.3, { o: 1 }]]);
    tr('qby', [[4.1, { o: 0, x: 8 }], [4.1 + D_IN, { o: 1, x: 0 }]]);
    tr('t1', toastIn(4.5).concat(toastOut(6.5)));
    tr('queued', [[4.5, { o: 0, y: -6 }], [4.5 + D_IN, { o: 1, y: 0 }]]);

    /* Transition 1 (6.5) */
    trip(6.8, 'slot-order', 'slot-sched', 1 / 3);

    /* Stage 2 -- Production */
    tr('sched', cardIn(7.15).concat(cardOut(11.75)));
    var chip = S['slot-sched'], cx = chip.x + chip.w / 2, cy = chip.y + chip.h / 2;
    /* the search: the two free slots light up in order, print then cut ... */
    var gapKeys = { gap1: [[7.6, { o: 0 }], [7.85, { o: 1 }]], gap2: [[7.72, { o: 0 }], [7.97, { o: 1 }]] };
    /* ... then the order splits into them, the print first, the cut 120 ms later */
    ['p1', 'p2'].forEach(function (n, k) {
      var r = rect(q(n)), t0 = 8.05 + k * .12, dx = cx - (r.x + r.w / 2), dy = cy - (r.y + r.h / 2);
      var d = travelDur(Math.hypot(dx, dy));
      tr(n, [[t0, { o: 0, x: dx, y: dy, l: 1 }], [t0 + .1, { o: 1 }], [t0 + d, { x: 0, y: 0, l: 0 }, TRAVEL]]);
      gapKeys['gap' + (k + 1)].push([t0 + d, { o: 1 }], [t0 + d + D_SAT, { o: 0 }, EXIT]);   /* filled */
    });
    tr('gap1', gapKeys.gap1); tr('gap2', gapKeys.gap2);
    tr('now', [[8.85, { o: 0, y: ty(g, '09:00') - ty(g, '11:24') }], [8.9, { o: 1 }, LIN], [8.9, { y: ty(g, '09:00') - ty(g, '11:24') }], [9.8, { y: 0 }, TRAVEL]]);
    tr('ring', [[9.8, { o: 0 }], [10.1, { o: 1 }]]);

    /* Transition 2 (11.6): no satellites */
    trip(11.9, 'slot-sched', 'slot-done', 2 / 3);

    /* Stage 3 -- Operations */
    tr('done', cardIn(12.25).concat(cardOut(16.6)));
    /* Task actions grows from the card's dots; on mobile it sits below the
       card and leaves once the date has changed, making room for the comment */
    var doneR = rect(q('done')), below = doneR.y + doneR.h + 16;
    q('cmt').style.top = U(below);
    if (M) q('menu').style.top = U(below);
    var mr = rect(q('menu')), dots = rect(q('dots'));
    q('menu').style.transformOrigin = U(dots.x + dots.w / 2 - mr.x) + ' ' + U(dots.y + dots.h / 2 - mr.y);
    tr('menu', [[12.7, { o: 0, s: .96 }], [12.95, { o: 1, s: 1 }]].concat(M ? satOut(13.5) : satOut(16.45)));
    tr('duehl', [[13.0, { o: 0 }], [13.2, { o: 1 }]]);
    tr('due23', [[13.2, { o: 1, y: 0 }], [13.45, { o: 0, y: -12 }, TRAVEL]]);
    tr('due22', [[13.2, { o: 0, y: 12 }], [13.45, { o: 1, y: 0 }, TRAVEL]]);
    tr('knob', [[13.6, { x: 0 }], [14.3, { x: travel }, TRAVEL]]);
    tr('knobok', [[14.3, { o: 0 }], [14.5, { o: 1 }]]);
    tr('cmt', [[14.5, { o: 0, y: -12 }], [14.5 + D_IN, { o: 1, y: 0 }]].concat(satOut(16.45)));

    /* Transition 3 (16.45) */
    trip(16.75, 'slot-done', 'slot-track', 1);

    /* Stage 4 -- Shipping */
    tr('track', cardIn(17.1));
    var seg = [[17.55, 17.9], [18.02, 18.37]];
    tr(M ? 'vfill' : 'tfill', M ? [[seg[0][0], { sy: 0 }], [seg[0][1], { sy: 1 / 3 }, TRAVEL], [seg[1][0], { sy: 1 / 3 }], [seg[1][1], { sy: 2 / 3 }, TRAVEL]]
                                : [[seg[0][0], { sx: 0 }], [seg[0][1], { sx: 1 / 3 }, TRAVEL], [seg[1][0], { sx: 1 / 3 }], [seg[1][1], { sx: 2 / 3 }, TRAVEL]]);
    [17.4, seg[0][1], seg[1][1]].forEach(function (t0, k) {
      tr('tn' + k, [[t0, { o: 0 }], [t0 + .15, { o: 1 }]]);
      tr('td' + k, [[t0, { o: 0 }], [t0 + .25, { o: 1 }]]);
    });
    for (i = 0; i < 3; i++) tr('ur' + i, [[18.6, { o: 0, x: 8 }], [18.6 + D_IN, { o: 1, x: 0 }]]);
    tr('t2', toastIn(19.1));

    /* captions: out with the card, in with the next one; never together */
    var capOut = [6.65, 11.75, 16.6], capIn = [null, 7.15, 12.25, 17.1];
    for (i = 0; i < 4; i++) {
      var k2 = [];
      if (i > 0) k2.push([0, { o: 0 }], [capIn[i], { o: 0, x: 16 }], [capIn[i] + D_IN, { o: 1, x: 0 }]);
      if (i < 3) k2.push([capOut[i], { o: 1, x: 0 }], [capOut[i] + D_SAT, { o: 0, x: -8 }, EXIT]);
      tr('cap' + i, k2);
    }

    tr('token', tk); tr('tokl', tl); tr('railfill', rl);
    return { tracks: T, switches: switches };
  }

  /* --- the promo, as the engine sees it ------------------------------- */
  var PROMO = {
    stages: STAGES, captions: CAPTIONS, description: DESCRIPTION, stageW: STAGE_W,
    END: END, FRAME_T: FRAME_T, TRANS_IN: TRANS_IN,
    markup: function (mobile) {
      return mobile ? { stage: mobileStage(), float: mobileFloat() } : { stage: desktopStage(), float: desktopFloat() };
    },
    choreography: choreography,
    /* the quote total counts up as its lines arrive */
    onSeek: function (t, q) {
      var total = q('total');
      if (total) {
        var txt = '€' + Math.round(580 * ENTER(Math.max(0, Math.min(1, (t - 3.3) / .6)))) + ',00';
        if (total.textContent !== txt) total.textContent = txt;
      }
    }
  };

  window.Promo = {
    frame: function (n, opts) { return E.frame(PROMO, n, opts); },
    create: function (mobile) { return E.create(PROMO, mobile); },
    STAGES: STAGES, FRAME_T: FRAME_T, END: END
  };

  function boot() { var h = document.querySelector('.pmr__vis'); if (h) E.mount(h, PROMO); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
