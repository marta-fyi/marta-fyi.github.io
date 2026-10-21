/* Production Hub -- the promo: one order, #39208, through four teams and
 * back to the client.
 *
 * One master timeline in real seconds, played once: Accounts, Production,
 * Operations, Shipping -- which ends on the client's side, with the automatic
 * "on its way" email and its tracker -- then holds with Replay. The
 * timeline is a pure function of time: seek(t) writes every element's
 * transform and opacity for that instant and nothing else, so playing,
 * jumping, replaying and reduced motion are all just seek().
 *
 * Grammar:
 *   - Only the order token travels between stages: artwork (3:4), mint bar,
 *     #39208 and the order's state under it, always the same size, moved by
 *     translation alone. The state is the shared record made visible: it
 *     changes at each team's beat, and every team sees the same one.
 *   - In Production the order splits: two part chips leave the token for the
 *     two free slots, and each part fills its slot as its chip lands.
 *   - Every stage change is the same 1.1 s: satellites out (0-180 ms),
 *     primary card out to the left (200-450), token travels with the rail in
 *     sync (from 300), next card in from the right (500-950), while the
 *     token is still travelling, so the stage is never empty.
 *   - Tokens: enter 450 ms cubic-bezier(.22,1,.36,1) + 16 px; exit 250 ms
 *     (satellites 180) cubic-bezier(.55,0,1,.45); travel
 *     cubic-bezier(.65,0,.35,1) at 300/450/550 ms by distance.
 *   - Holds of 1.5 s on each stage's final frame, 2 s on the last.
 *   - Times are written from each stage's transition start (T1-T3, CL), so
 *     a stage can be retimed without touching the ones after it by hand.
 *
 * Two authored frames share one choreography, both sized with container
 * query units (no transform scaling, so text renders crisp):
 *   desktop  600x760 design px (>= 768px)
 *   mobile   340x780 design px, the same story laid out narrow (< 768px)
 *
 * Geometry is kept in design px; the engine converts to CSS px at draw time.
 * Time, tracks, the rail, playback and the QA hook (window.__promo) live in
 * the shared engine, work/_shared/promo.js; this file is content only.
 */
(function () {
  'use strict';

  var A = '/assets/promo/';
  /* stage transitions: Production, Operations, Shipping; CL is the switch
     to the client's email, inside Shipping */
  var T1 = 7.0, T2 = 14.35, T3 = 19.85, CL = T3 + 2.45;
  var END = CL + 4.15;
  var FRAME_T = [T1 - .05, T2 - .05, T3 - .05, END - .05];   /* each stage's final frame */
  var TRANS_IN = [null, T1, T2, T3];                         /* start of the transition into each stage */
  var STAGE_W = { d: 568, m: 316 };               /* design width of the white stage */
  var STAGES = ['Accounts', 'Production', 'Operations', 'Shipping'];
  /* the fifth caption replaces the fourth when the story moves to the client */
  var CAPTIONS = ['Files, quote and payment', 'Fits into the gaps',
                  'Ready for pickup', 'Shipped and tracked', 'The client is told, automatically'];
  /* the order's state, carried on the token, and when each one is reached */
  var STATES = ['New order', 'Accepted', 'Queued', 'Scheduled', 'Printed', 'Ready to ship', 'Courier notified', 'Shipped'];
  var DESCRIPTION = 'One order, #39208, moving through four teams and back to the client, its state updating as it goes. ' +
    'Accounts: the client uploads AW_Campaign_2024.AI, the €580,00 quote is accepted by John Walters and paid by credit card, the account manager is asked to approve it for production, and the order is queued. ' +
    'Production: in a schedule already full of other orders, the two free slots it needs light up, a print slot on Printer 2 and the cutting slot on Cutter 1 right after it, and the order splits into its print job and its cutting job, which fill them. The print finishes at 10:45 and the order is ready for cutting on Cutter 1; the cut finishes at 11:30 and it is ready to pack and ship. ' +
    'Operations: on the job Akatsuki Asuma Mogato, the courier is notified that the order is packed and ready for pickup at Sant Cugat, and the task is marked done. ' +
    'Shipping: Seur picks the order up at Sant Cugat on 22/04/2024 at 17:56 and it is shipped. ' +
    'Back at the client, John Walters at Brownie gets an automatic email that the order is on its way, with his own tracker, delivery on 23/04, and a link to follow it.';

  /* --- icons ----------------------------------------------------------- */
  var ICONS = {
    close:  '<path d="M6 6l12 12M18 6 6 18"/>',
    check:  '<path d="M5 12.5 9.8 17 19 7.5"/>',
    checkc: '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.5 2.4 4.9-5"/>',
    upload: '<path d="M12 15V4.5M8 8.5l4-4 4 4"/><path d="M4.5 14v3.5A2 2 0 0 0 6.5 19.5h11a2 2 0 0 0 2-2V14"/>',
    fileup: '<path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5l-5-5Z"/><path d="M13.5 3.5v5h5M12 17.5v-6M9.5 14l2.5-2.5 2.5 2.5"/>',
    quote:  '<path d="M6.5 3.5h11v17l-2.2-1.5-2.1 1.5-2.2-1.5-2.2 1.5-2.3-1.5V3.5Z"/><path d="M9.5 8h5M9.5 11.5h5M9.5 15h3"/>',
    mail:   '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5"/>',
    pin:    '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    bell:   '<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z"/><path d="M10 18.5a2.2 2.2 0 0 0 4 0"/>',
    assign: '<circle cx="9.5" cy="7.5" r="3.5"/><path d="M3 20c0-3.3 2.9-6 6.5-6 1 0 2 .2 2.8.6"/><circle cx="17.5" cy="16.5" r="4.5"/><path d="M17.5 14.5v4M15.5 16.5h4"/>',
    pencil: '<path d="M4 20h4L19.3 8.7a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M15.5 6.5 17.5 8.5"/>',
    truck:  '<path d="M3.5 15.5v-9h10v9M13.5 9.5h3.8l3.2 3.4v2.6h-1.2M9.6 15.5h5.6"/><circle cx="7.5" cy="16.5" r="1.9"/><circle cx="17.3" cy="16.5" r="1.9"/>',
    calalert:'<rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4M12 13v3"/><circle cx="12" cy="18" r=".6" fill="currentColor" stroke="none"/>',
    cal:    '<rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4"/>',
    chev:   '<path d="M9 5.5 15.5 12 9 18.5"/>',
    dots:   '<circle cx="12" cy="5.5" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.35" fill="currentColor" stroke="none"/>'
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
      '<div class="drop"' + (M ? ' style="height:' + U(124) + ';padding:0 ' + U(16) + ';text-align:center"' : '') + '><span class="drop__hl" data-a="drophl"></span><span class="drop__i" data-a="dropi">' + ic('fileup') + '</span>' +
      '<p>Drag &amp; drop your files here or <a>choose file</a></p><p style="font-size:' + U(12) + ';color:var(--grey)">500 MB max file size.</p></div>' +
      '<div data-a="frowup" style="margin-top:' + U(16) + '">' + row + '<div class="prog"><i data-a="pfill"></i></div></div>' +
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
      '<div class="hr"></div>' + slot('slot-order') +
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
      '<div class="qt" data-a="qt"><span>Total</span><span class="num">€580,00</span></div>' +
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
      '<div class="job__b"><p class="job__id">' + o.id + '</p>' + (o.nm ? '<p class="job__nm">' + o.nm + '</p>' : '') + '</div>' +
      (o.ok ? '<span class="job__ok" data-a="' + o.ok + '">' + ic('check') + '</span>' : '') + '</div>';
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
    ['09:00', '10:00', '11:00', '12:00'].forEach(function (t, i) {
      s += '<span class="tick num" data-a="tick' + i + '" style="' + at(g.tickX, ty(g, t)) + '">' + t + '</span>' +
           '<span class="grid" style="' + at(g.gridX, ty(g, t), g.gridW) + '"></span>';
    });
    g.laneX.forEach(function (x) { s += '<span class="lane" style="' + at(x - (g.m ? 2 : 3), g.t0 - 16, null, g.bottom - g.t0) + '"></span>'; });
    /* a full day: the other two orders each print, then cut, on every machine.
       The only room is Printer 2 09:45-10:45 and Cutter 1 straight after.
       They step back once #39208's slots light up. */
    [[0, '09:00', '10:15', '98410', 'Print'], [0, '10:15', '12:00', '618716', 'Print'],
     [1, '09:00', '09:45', '618716', 'Print'], [1, '10:45', '12:00', '98410', 'Print'],
     [2, '09:45', '10:45', '618716', 'Cutting'], [2, '11:30', '12:00', '98410', 'Cutting']].forEach(function (j, k) {
      s += job(ext(ext(lane(g, j[0], j[1], j[2]), { order: j[3], id: '#' + j[3], nm: j[4], a: 'oj' + k }), narrow));
    });
    /* headers before the parts: a part drops over its station into the lane, like a dragged card */
    STATIONS.forEach(function (st, i) {
      s += '<div class="st' + (g.m ? ' st--m' : '') + '" style="' + at(g.laneX[i], g.headY, g.laneW) + '"><img src="' + A + 'station-' + st[2] + '.webp" alt="">' +
        '<div><p class="st__n">' + st[0] + '</p>' + (g.m ? '' : '<p class="st__m">' + st[1] + '</p>') + '</div>' +
        '</div>';
    });
    s += gap(g, 1, '09:45', '10:45', 'gap1') + gap(g, 2, '10:45', '11:30', 'gap2');
    s += job(ext(ext(lane(g, 1, '09:45', '10:45'), { order: '39208', id: '#39208-01', nm: 'Print', a: 'p1', ok: 'p1ok' }), narrow));
    s += job(ext(ext(lane(g, 2, '10:45', '11:30'), { order: '39208', id: '#39208-02', nm: 'Cutting', a: 'p2', ok: 'p2ok' }), narrow));
    /* the two part chips the order splits into, on their way to the slots */
    ['01', '02'].forEach(function (n, k) {
      s += '<div class="tokn tokn--part" data-a="spl' + (k + 1) + '"><span class="job__bar"></span>' +
        (g.m ? '' : '<img src="' + A + 'art-39208.webp" alt="">') + '<p class="num">#39208-' + n + '</p></div>';
    });
    var y = ty(g, '11:30');
    s += '<div data-a="now" style="position:absolute;inset:0"><span class="now" style="' + at(g.gridX, y, g.gridW) + '"></span>' +
         '<span class="tpill num" data-a="clock" style="' + at(g.pillX, y) + '">11:30</span></div>';
    s += slot('slot-sched', 'slot--ghost" style="' + at(g.chip[0], g.chip[1]));
    return '<div data-a="sched" style="position:absolute;inset:0">' + s + '</div>';
  }

  function doneCard(x, y, w) {
    return '<div class="done" data-a="done" style="' + at(x, y, w) + '">' + LIFT +
      slot('slot-done') + '<span class="done__dots" data-a="dots">' + ic('dots') + '</span>' +
      '<p class="done__ey" style="margin-top:' + U(14) + '">Job</p><p class="done__nm">Akatsuki Asuma Mogato</p><p class="done__sp">NEPTUNE_Vinyl_345x543</p>' +
      '<span class="due">' + ic('cal') + '<span class="num">Due 23/04/2024</span></span>' +
      '<div class="slide" data-a="slide"><span class="knob" data-a="knob">' + ic('check') + '<span class="knob--ok" data-a="knobok">' + ic('check') + '</span></span>' +
      '<span class="slide__l" data-a="slabel">Drag to mark done<span class="slide__chev">' + ic('chev') + ic('chev') + ic('chev') + '</span></span>' +
      '<span class="slide__done" data-a="sdone">Marked as done</span></div></div>';
  }

  function taskMenu(x, y, w) {
    var rows = [['assign', 'Assign'], ['truck', 'Notify courier', 1], ['pencil', 'Reminder notification'], ['calalert', 'Due date']];
    return '<div class="c menu" data-a="menu" style="' + at(x, y, w) + '">' + LIFT +
      '<div class="ch"><p class="ch__t">Task actions</p>' + ic('close', 'ch__x') + '</div>' +
      rows.map(function (r) {
        return '<div class="mi">' + (r[2] ? '<span class="mi__hl" data-a="courhl"></span>' : '') + '<span class="mi__i">' + ic(r[0]) + '</span><span>' + r[1] + '</span></div>';
      }).join('') + '</div>';
  }

  /* the notice the courier gets: packed, and ready to collect */
  function courierCard(x, y, w) {
    return '<div class="c cour" data-a="cour" style="' + at(x, y, w) + '">' + LIFT +
      '<div class="ch"><span class="ch__tile">' + ic('truck') + '</span>' +
      '<div class="mail__h"><p class="ch__t">Pickup request</p><p class="mail__to">To Seur · Courier</p></div>' +
      '<span class="pill pill--mint" data-a="csent">Sent</span></div>' +
      '<p class="cour__b">Order #39208 is packed and ready for pickup at Sant Cugat today, 22/04.</p></div>';
  }

  /* Shipping, inside: the courier has it. The tracker is the client's, in the email. */
  function shipmentCard(x, y, w, M) {
    return '<div class="c" data-a="track" style="' + at(x, y, w) + '">' + LIFT +
      '<div class="ch"><span class="ch__tile">' + ic('pin') + '</span><p class="ch__t">Shipment</p>' +
      '<span class="pill pill--mint" data-a="shp">Shipped</span></div>' +
      '<div class="frow">' + slot('slot-track') + '<div><p class="frow__n">Seur</p><p class="frow__s">Banner × 10</p></div></div>' +
      '<p class="upd__h">Updates</p>' +
      (M ? '<div class="upd upd--2"><span class="h">Date</span><span class="h">Event</span>' +
           '<span class="r num" data-a="ur0">22/04/2024 - 17:56<br>Sant Cugat, ES</span>' +
           '<span class="r" data-a="ur1"><span class="ev">Picked up</span><br>Carrier: Seur</span></div>'
         : '<div class="upd"><span class="h">Date</span><span class="h">Location</span><span class="h">Event</span>' +
           '<span class="r num" data-a="ur0">22/04/2024 - 17:56</span><span class="r" data-a="ur1">Sant Cugat, ES</span>' +
           '<span class="r" data-a="ur2"><span class="ev">Picked up</span><br>Carrier: Seur</span></div>') +
      '</div>';
  }

  /* the client's end: the automatic "on its way" email, with their own tracker */
  var MAIL_TRK = [['Ordered', '19/04'], ['Printed', '21/04'], ['Shipped', '22/04'], ['Delivery', '23/04']];
  function mailCard(x, y, w, M) {
    var pos = [0, 100 / 3, 200 / 3, 100];
    var nodes = pos.map(function (p, i) {
      return '<span class="trk__n" style="left:' + p + '%"></span>' +
        (i < 3 ? '<span class="trk__n trk__n--on" data-a="mn' + i + '" style="left:' + p + '%">' + ic('check') + '</span>' : '');
    }).join('');
    var labels = MAIL_TRK.map(function (l, i) {
      var align = i === 0 ? 'left:0' : i === 3 ? 'right:0;text-align:right' : 'left:' + pos[i] + '%;transform:translateX(-50%);text-align:center';
      return '<div class="trk__l" style="' + align + '"><p>' + l[0] + '</p><p class="num">' + l[1] + '</p></div>';
    }).join('');
    return '<div class="c mail" data-a="mail" style="' + at(x, y, w) + '">' + LIFT +
      '<div class="ch">' + (M ? '' : '<span class="ch__tile">' + ic('mail') + '</span>') +
      '<div class="mail__h"><p class="ch__t">Your order is on its way</p><p class="mail__to">To John Walters · Brownie</p>' +
      (M ? '<span class="pill pill--mint mail__auto" data-a="auto">Automatic</span></div>'                /* narrow: under the recipient */
         : '</div><span class="pill pill--mint" data-a="auto">Automatic</span>') + '</div>' +
      '<div class="mail__o' + (M ? ' mail__o--m' : '') + '">' + slot('slot-mail') + '<div><p class="mail__n">Banner × 10</p><p class="mail__s">Shipped with Seur, arriving 23/04</p></div></div>' +
      '<div class="trk"><i class="trk__fill" data-a="mfill"></i>' + nodes + '</div>' +
      '<div class="trk__labels mail__labels">' + labels + '</div>' +
      '<span class="mail__btn" data-a="mbtn">Track your order</span></div>';
  }

  function token() {
    return '<div class="tokn" data-a="token"><i class="pm-lift" data-a="tokl"></i><span class="job__bar"></span>' +
      '<img src="' + A + 'art-39208.webp" alt=""><div class="tokn__b"><p class="num">#39208</p>' +
      '<span class="stack tokn__st">' + STATES.map(function (s, i) { return '<span data-a="st' + i + '">' + s + '</span>'; }).join('') +
      '</span></div></div>';
  }

  /* --- the two stages -------------------------------------------------- */
  function desktopStage() {
    return uploadCard(60, 70, 448) + dropPill() +
      orderCard(20, 24, 296) + quoteCard(240, 232, 308) +
      schedule(GEO.d) +
      doneCard(24, 40, 276) + taskMenu(312, 56, 240) + courierCard(24, 352, 524) +
      shipmentCard(60, 120, 448) + mailCard(60, 84, 448) + token();
  }
  /* notifications float over the stage, unclipped */
  function desktopFloat() {
    return toast('t1', -12, 582, 360, 'req', 'Approve #39208 for production', 'Sent by Account Manager') +
      toast('t3', 196, 14, 360, 'ok', '#39208-01 printed', 'Ready for cutting on Cutter 1') +   /* in the strip beside the order */
      toast('t4', 196, 14, 360, 'ok', '#39208-02 cut', 'Ready to pack and ship');
  }
  function mobileStage() {
    return uploadCard(12, 24, 292, true) + dropPill() +
      orderCard(12, 12, 292, true) + quoteCard(24, 300, 280, true) +
      schedule(GEO.m) +
      doneCard(12, 12, 292) + taskMenu(12, 320, 292) + courierCard(12, 320, 292) +
      shipmentCard(12, 58, 292, true) + mailCard(12, 40, 292, true) + token();
  }
  function mobileFloat() {
    return toast('t1', -6, 600, 300, 'req', 'Approve for production', 'Sent by Account Manager') +   /* one line at 300 */
      toast('t3', -6, 600, 300, 'ok', '#39208-01 printed', 'Ready for cutting on Cutter 1') +
      toast('t4', -6, 600, 300, 'ok', '#39208-02 cut', 'Ready to pack and ship');
  }

  /* --- motion, from the engine --------------------------------------- */
  var ENTER = E.ENTER, EXIT = E.EXIT, TRAVEL = E.TRAVEL, LIN = E.LIN, Track = E.Track;
  var D_IN = E.D_IN, D_OUT = E.D_OUT, D_SAT = E.D_SAT, travelDur = E.travelDur;
  var SETTLE = E.bez(.34, 1.45, .64, 1, 'cubic-bezier(.34,1.45,.64,1)');   /* a small overshoot, then rest */

  /* Production, from T1: the slots light, the order splits, the parts fill. */
  var LIT = T1 + 1.4;                        /* the two free slots light up */
  var SPLIT = LIT + .4;                      /* the part chips leave the token */
  var SPLIT_TRAVEL = .55;                    /* fixed, so desktop and mobile share one clock */
  var FILL = [0, 1].map(function (k) { var f0 = SPLIT + .1 + k * .15 + SPLIT_TRAVEL; return [f0, f0 + .5]; });
  /* The time line, [seconds, minutes after 09:00]: it sweeps to 10:45, the end
     of the print, holds for the print-done notice, then moves on to 11:30, the
     end of the cut. The line's track and the pill's clock both read it. */
  var N0 = FILL[1][1] + .3;
  var NOW = [[N0, 0], [N0 + .6, 105], [N0 + 1.5, 105], [N0 + 1.9, 150]];
  var PRINTED = NOW[1][0], CUT = NOW[3][0];
  /* Operations, from T2: the menu, Notify courier, the notice, the task done. */
  var MENU = T2 + 1.1, COUR = T2 + 1.9, SENT = COUR + .45, KNOB = T2 + 2.85;
  /* Shipping, from T3: picked up and shipped; then the client, from CL. */
  var SHIPPED = T3 + 1.0;
  var ST_T = [null, 4.2, 5.0, FILL[1][1], PRINTED, CUT, SENT, SHIPPED];   /* when each state is reached */

  function clockAt(t) {
    if (t <= NOW[0][0]) return NOW[0][1];
    for (var i = 1; i < NOW.length; i++) if (t < NOW[i][0]) {
      var a = NOW[i - 1], b = NOW[i]; return a[1] + (b[1] - a[1]) * TRAVEL((t - a[0]) / (b[0] - a[0]));
    }
    return NOW[NOW.length - 1][1];
  }

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
    function pop(t0) { return [[t0, { o: 0, s: .8 }], [t0 + D_IN, { o: 1, s: 1 }, SETTLE]]; }
    function rise(t0) { return [[t0, { o: 0, x: 8 }], [t0 + D_IN, { o: 1, x: 0 }]]; }

    /* layout-dependent positions, design px */
    var dropi = rect(q('dropi')), pill = q('pill'), pillW = rect(pill).w;
    /* hovering the drop zone: over its icon, which steps back while the file is there */
    var pillAt = [dropi.x + dropi.w / 2 - pillW / 2, dropi.y + dropi.h / 2 - 15];
    pill.style.left = U(pillAt[0]); pill.style.top = U(pillAt[1]);
    /* the file is dragged in from below the stage's edge, never sitting on the card */
    var pillFrom = { x: M ? 0 : 30, y: rect(pill.parentNode).h + 8 - pillAt[1] };
    var S = {};
    ['slot-up', 'slot-order', 'slot-sched', 'slot-done', 'slot-track', 'slot-mail'].forEach(function (k) { S[k] = rect(q(k)); });
    var travel = rect(q('slide')).w - 12 - 44;

    /* the token: translation only, between slots. Each trip also moves the
       rail when it is a stage change, with the same start, duration, ease. */
    var tk = [[0, { o: 0, x: S['slot-up'].x, y: S['slot-up'].y }], [1.0, { o: 0 }], [1.2, { o: 1 }]];
    var rl = [[0, { sx: 0 }]], switches = [0], tl = [[0, { o: 0 }]];
    function trip(t0, from, to, railTo) {
      var d = travelDur(Math.hypot(S[to].x - S[from].x, S[to].y - S[from].y));
      tk.push([t0, { x: S[from].x, y: S[from].y }], [t0 + d, { x: S[to].x, y: S[to].y }, TRAVEL]);
      tl.push([t0, { o: 0 }], [t0 + .12, { o: 1 }], [t0 + d - .12, { o: 1 }], [t0 + d, { o: 0 }]);
      if (railTo != null) { rl.push([t0, { sx: railTo - 1 / 3 }], [t0 + d, { sx: railTo }, TRAVEL]); switches.push(t0 + d / 2); }
      return d;
    }

    /* the order's state rolls up on the token at each beat */
    STATES.forEach(function (s, k) {
      var keys = k === 0 ? [[0, { o: 1, y: 0 }]] : [[0, { o: 0, y: 8 }], [ST_T[k], { o: 0, y: 8 }], [ST_T[k] + .3, { o: 1, y: 0 }]];
      if (k < STATES.length - 1) keys.push([ST_T[k + 1], { o: 1, y: 0 }], [ST_T[k + 1] + .25, { o: 0, y: -8 }, EXIT]);
      tr('st' + k, keys);
    });

    /* Stage 1 -- Accounts. The first frame is drawn before play: no entrance. */
    tr('up', cardOut(2.1));
    tr('pill', [[0, { x: pillFrom.x, y: pillFrom.y, l: 1 }], [.3, { x: pillFrom.x, y: pillFrom.y }],
                [.85, { l: 1 }], [1.0, { x: 0, y: 0, l: 0 }, TRAVEL],
                [1.0, { o: 1, s: 1 }], [1.0 + D_SAT, { o: 0, s: .92 }, EXIT]]);
    tr('drophl', [[.7, { o: 0 }], [.85, { o: 1 }], [1.0, { o: 1 }], [1.0 + D_IN, { o: 0 }]]);   /* drag-over */
    tr('dropi', [[.7, { o: 1 }], [.85, { o: 0 }], [1.0, { o: 0 }], [1.0 + D_IN, { o: 1 }]]);
    tr('frowup', [[1.0, { o: 0 }], [1.0 + D_IN, { o: 1 }]]);
    tr('pfill', [[1.0, { sx: 0 }], [1.8, { sx: 1 }, TRAVEL]]);
    tr('pcheck', [[1.8, { o: 0, x: 8 }], [1.8 + D_IN, { o: 1, x: 0 }]]);
    trip(2.25, 'slot-up', 'slot-order');
    tr('order', cardIn(2.35).concat(cardOut(T1 + .2)));
    tr('quote', cardIn(3.0).concat(satOut(T1)));
    for (i = 0; i < 4; i++) tr('ql' + i, rise(3.1 + i * .08));
    tr('qt', rise(3.3));
    /* the client accepts and pays: Sent rolls up to Accepted as Credit card selects */
    tr('sent', [[4.1, { o: 1, y: 0 }], [4.3, { o: 0, y: -10 }, EXIT]]);
    tr('accepted', [[4.1, { o: 0, y: 10 }], [4.3, { o: 1, y: 0 }]]);
    tr('cardon', [[4.1, { o: 0 }], [4.3, { o: 1 }]]);
    tr('qby', rise(4.1));
    /* then the account manager is asked to approve it for production, and it queues */
    tr('t1', toastIn(4.5).concat(toastOut(T1)));
    tr('queued', [[5.0, { o: 0, y: -6 }], [5.0 + D_IN, { o: 1, y: 0 }]]);

    /* Transition 1 */
    trip(T1 + .3, 'slot-order', 'slot-sched', 1 / 3);

    /* Stage 2 -- Production. A full day first; then the other orders step
       back, the two free slots light up in order, print then cut, and the
       order splits: a chip per part leaves the token for its slot, and the
       part fills the slot top to bottom, like a sheet coming off the
       printer, as its chip lands. Nothing is dragged. */
    tr('sched', cardIn(T1 + .5).concat(cardOut(T2 + .2)));
    for (i = 0; i < 6; i++) tr('oj' + i, [[LIT, { o: 1 }], [LIT + .3, { o: .35 }]]);
    var from = S['slot-sched'];
    ['p1', 'p2'].forEach(function (n, k) {
      var f = FILL[k], lit = LIT + k * .12, g1 = rect(q('gap' + (k + 1))), chip = q('spl' + (k + 1)), cw = rect(chip).w;
      var to = { x: g1.x + (g1.w - cw) / 2, y: g1.y + 8 }, go = SPLIT + .05 + k * .15;
      tr('gap' + (k + 1), [[lit, { o: 0, s: 1 }], [lit + .25, { o: 1 }], [f[0] - .3, { s: 1 }],
                           [f[0] - .12, { s: 1.03 }, ENTER], [f[0] + .06, { s: 1 }, EXIT],   /* pulse as the chip lands */
                           [f[0], { o: 1 }], [f[1], { o: 0 }, EXIT]]);
      tr('spl' + (k + 1), [[0, { o: 0, x: from.x, y: from.y }], [SPLIT + k * .15, { o: 0 }], [SPLIT + k * .15 + .15, { o: 1 }],
                           [go, { x: from.x, y: from.y }], [go + SPLIT_TRAVEL, { x: to.x, y: to.y }, TRAVEL],
                           [f[0] + .1, { o: 1 }], [f[0] + .3, { o: 0 }]]);
      tr(n, [[f[0], { o: 0, cp: 0 }], [f[0] + .15, { o: 1 }, LIN], [f[1], { cp: 1 }, TRAVEL]]);
    });
    tl.push([SPLIT - .05, { o: 0 }], [SPLIT + .05, { o: 1 }], [FILL[1][0], { o: 1 }], [FILL[1][0] + .15, { o: 0 }]);   /* the token lifts while it splits */

    /* the time line, two beats: the print finishes at 10:45, the cut at 11:30 */
    function nowY(m) { return (m - 150) / 60 * g.pxH; }   /* offset from its 11:30 home */
    var nk = [[NOW[0][0] - .05, { o: 0, y: nowY(0) }], [NOW[0][0], { o: 1 }, LIN]];
    NOW.forEach(function (p) { nk.push([p[0], { y: nowY(p[1]) }, TRAVEL]); });
    tr('now', nk);
    tr('p1ok', [[PRINTED, { o: 0, s: .6 }], [PRINTED + D_IN, { o: 1, s: 1 }, SETTLE]]);
    tr('p2ok', [[CUT, { o: 0, s: .6 }], [CUT + D_IN, { o: 1, s: 1 }, SETTLE]]);
    /* notices: printed, then replaced by ready to pack and ship. Desktop drops
       them into the strip beside the order; mobile uses the usual corner. */
    function noteIn(t0) { return M ? toastIn(t0) : [[t0, { o: 0, y: -12 }], [t0 + D_IN, { o: 1, y: 0 }]]; }
    function noteOut(t0) { return M ? toastOut(t0) : [[t0, { o: 1, y: 0 }], [t0 + D_SAT, { o: 0, y: -8 }, EXIT]]; }
    tr('t3', noteIn(PRINTED + .1).concat(noteOut(CUT - .05)));
    tr('t4', noteIn(CUT + .1).concat(noteOut(T2)));

    /* Transition 2: the ready-to-ship notice leaves first */
    trip(T2 + .3, 'slot-sched', 'slot-done', 2 / 3);

    /* Stage 3 -- Operations. Task actions grows from the job card's dots;
       Notify courier is picked, the courier's pickup request is sent, and
       the task is marked done. On mobile the menu sits below the card and
       leaves before the request takes its place. */
    tr('done', cardIn(T2 + .5).concat(cardOut(T3 + .2)));
    var doneR = rect(q('done')), below = doneR.y + doneR.h + 16;
    q('cour').style.top = U(below);
    if (M) q('menu').style.top = U(below);
    var mr = rect(q('menu')), dots = rect(q('dots'));
    q('menu').style.transformOrigin = U(dots.x + dots.w / 2 - mr.x) + ' ' + U(dots.y + dots.h / 2 - mr.y);
    tr('menu', [[MENU, { o: 0, s: .96 }], [MENU + .25, { o: 1, s: 1 }]].concat(satOut(M ? COUR - .25 : T3)));
    tr('courhl', [[MENU + .35, { o: 0 }], [MENU + .55, { o: 1 }]]);
    tr('cour', [[COUR, { o: 0, y: -12 }], [COUR + D_IN, { o: 1, y: 0 }]].concat(satOut(T3)));
    tr('csent', pop(SENT));
    tr('knob', [[KNOB, { x: 0 }], [KNOB + .7, { x: travel }, TRAVEL]]);
    tr('slabel', [[KNOB + .1, { o: 1 }], [KNOB + .4, { o: 0 }, LIN]]);            /* the knob drags the label away */
    tr('knobok', [[KNOB + .7, { o: 0 }], [KNOB + .9, { o: 1 }]]);
    tr('sdone', [[KNOB + .7, { o: 0, x: -8 }], [KNOB + .7 + D_IN, { o: 1, x: 0 }]]);

    /* Transition 3 */
    trip(T3 + .3, 'slot-done', 'slot-track', 1);

    /* Stage 4 -- Shipping: Seur has it */
    tr('track', cardIn(T3 + .5).concat(cardOut(CL)));
    tr('shp', pop(SHIPPED));
    for (i = 0; i < 3; i++) tr('ur' + i, rise(SHIPPED));

    /* ... and at the same moment, on the client's end: the automatic email.
       The shipment steps aside, the order travels into the email, the
       client's tracker catches up, and the link to follow it arrives. Same
       stage, so the rail does not move; the caption changes instead. */
    trip(CL + .1, 'slot-track', 'slot-mail');
    tr('mail', cardIn(CL + .3));
    tr('auto', pop(CL + .7));
    var m0 = CL + .95;
    tr('mfill', [[m0, { sx: 0 }], [m0 + .25, { sx: 1 / 3 }, TRAVEL], [m0 + .3, { sx: 1 / 3 }], [m0 + .55, { sx: 2 / 3 }, TRAVEL]]);
    [m0 - .1, m0 + .25, m0 + .55].forEach(function (t0, k) { tr('mn' + k, [[t0, { o: 0 }], [t0 + .15, { o: 1 }]]); });
    tr('mbtn', [[m0 + .75, { o: 0, y: 6 }], [m0 + .75 + D_IN, { o: 1, y: 0 }]]);

    /* captions: out with the card, in with the next one; never together */
    var capOut = [T1 + .15, T2 + .15, T3 + .15, CL], capIn = [null, T1 + .5, T2 + .5, T3 + .5, CL + .3];
    for (i = 0; i < CAPTIONS.length; i++) {
      var k2 = [];
      if (i > 0) k2.push([0, { o: 0 }], [capIn[i], { o: 0, x: 16 }], [capIn[i] + D_IN, { o: 1, x: 0 }]);
      if (i < CAPTIONS.length - 1) k2.push([capOut[i], { o: 1, x: 0 }], [capOut[i] + D_SAT, { o: 0, x: -8 }, EXIT]);
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
    /* the schedule's clock follows its time line, and an hour label steps
       back while the clock passes over it */
    onSeek: function (t, q) {
      var clock = q('clock');
      if (!clock) return;
      var m = clockAt(t), r = Math.round(m), hm = (9 + Math.floor(r / 60)) + ':' + ('0' + r % 60).slice(-2);
      hm = ('0' + hm).slice(-5);
      if (clock.textContent !== hm) clock.textContent = hm;
      var on = t >= NOW[0][0] - .05;
      for (var i = 0; i < 4; i++) {
        var o = on ? Math.max(0, Math.min(1, (Math.abs(m - i * 60) - 9) / 5)) : 1, v = o >= 1 ? '' : o.toFixed(2), tk = q('tick' + i);
        if (tk.style.opacity !== v) tk.style.opacity = v;
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
