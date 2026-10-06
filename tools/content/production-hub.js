/* Production Hub -- the promo: one order, #39208, through four teams.
 *
 * One master timeline, 19 s: Accounts 5.5 s, then Production, Operations and
 * Shipping at 4.5 s each. The timeline is a pure function of time: seek(t)
 * writes every element's transform and opacity for that instant, and nothing
 * else. Playing is seek() on a clock, jumping to a stage is seek() to its
 * final frame, and reduced motion is jumping without the clock. Nothing
 * accumulates, so the loop cannot drift.
 *
 * Two authored frames share the engine:
 *   desktop  600x760, scaled to its column (>= 768px)
 *   mobile   340x600, the token plus one card per stage (< 768px)
 * Both are scaled with a transform, so the choreography is exact at any width.
 *
 * Window.Promo exposes frame(n) for the storyboard and QA pages in tools/.
 */
(function () {
  'use strict';

  var A = '/assets/promo/';
  var S = [0, 5.5, 10, 14.5];            /* stage starts */
  var FILL_END = 18.6;                   /* rail reaches the end; then the reset */
  var END = 19;
  var FRAME_T = [5.45, 9.95, 14.45, 18.55];  /* each stage's final frame */
  var STAGES = ['Accounts', 'Production', 'Operations', 'Shipping'];
  var CAPTIONS = ['Files, quote and payment', 'Split across every station',
                  'Plans change, the order adapts', 'Shipped and tracked'];
  var DESCRIPTION = 'One order, #39208, moving through four teams. ' +
    'Accounts: the client uploads AW_Campaign_2024.AI, the €580,00 quote is sent, accepted by John Walters and paid by credit card, and the order is queued. ' +
    'Production: the order splits into three parts, printed on Printer 1 and Printer 2 at the same time and then cut on Cutter 1. ' +
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
    back:   '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    chev:   '<path d="M9 5.5 15.5 12 9 18.5"/>',
    dots:   '<circle cx="12" cy="5.5" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.35" fill="currentColor" stroke="none"/>',
    pause:  '<path d="M9 6v12M15 6v12"/>',
    play:   '<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>'
  };
  function ic(n, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n] + '</svg>'; }
  function at(x, y, w, h) {
    return 'left:' + x + 'px;top:' + y + 'px' + (w != null ? ';width:' + w + 'px' : '') + (h != null ? ';height:' + h + 'px' : '');
  }
  var LIFT = '<i class="pm-lift"></i>';

  /* --- components ------------------------------------------------------ */
  function rail() {
    return '<div class="pm__rail" role="group" aria-label="Stages"><div class="pm__track"><i class="pm__fill" data-a="railfill"></i></div>' +
      STAGES.map(function (s, i) {
        return '<button class="pm__node" type="button" data-stage="' + i + '" style="left:' + (i * 25) + '%"><span>' + s + '</span></button>';
      }).join('') + '</div>' +
      '<button class="pm__pp" type="button" aria-label="Pause animation">' + ic('pause') + '</button>';
  }
  function captions() {
    return CAPTIONS.map(function (c, i) { return '<p class="pm__cap" data-a="cap' + i + '">' + c + '</p>'; }).join('');
  }

  function uploadCard(x, y, w) {
    return '<div class="c" data-a="up" style="' + at(x, y, w) + '">' + LIFT +
      '<div class="ch"><span class="ch__tile">' + ic('upload') + '</span><p class="ch__t">Upload files</p>' +
      '<span style="font-size:13px;color:var(--grey)">#39208</span>' + ic('close', 'ch__x') + '</div>' +
      '<div class="drop"><span class="drop__i" data-a="dropi">' + ic('fileup') + '</span>' +
      '<p>Drag &amp; drop your files here or <a>choose file</a></p><p style="font-size:12px;color:var(--grey)">500 MB max file size.</p></div>' +
      '<div data-a="prow" style="margin-top:16px">' +
      '<div class="frow"><img class="art" data-a="artu" src="' + A + 'art-39208.webp" alt="" style="width:30px;height:44px">' +
      '<div><p class="frow__n">AW_Campaign_2024.AI</p><p class="frow__s num">21,3 MB</p></div>' +
      '<span class="pc" data-a="pcheck">' + ic('check') + '</span></div>' +
      '<div class="prog" data-a="pbar"><i data-a="pfill"></i></div></div>' +
      '</div>';
  }
  function dropPill() {
    return '<span class="fpill at" data-a="pill" style="gap:8px;padding-left:4px;border-radius:15px">' + LIFT +
      '<img src="' + A + 'art-39208.webp" alt="" style="width:16px;height:22px;object-fit:cover;border-radius:4px">AW_Campaign_2024.AI</span>';
  }

  function orderCard(x, y, w) {
    return '<div class="c" data-a="order" style="' + at(x, y, w) + '">' + LIFT +
      '<div class="ch"><p class="ch__t">Order details</p><span class="pill pill--mint" data-a="queued">Queued</span></div>' +
      '<div class="fr"><span>Client</span><span>Brownie</span></div>' +
      '<div class="fr"><span>Order ID</span><span>#39208</span></div>' +
      '<div class="fr"><span>Job type</span><span>Banner</span></div>' +
      '<div class="fr"><span>Priority</span><span><span class="pill pill--coral">High</span></span></div>' +
      '<div class="hr"></div>' +
      '<div class="frow"><img class="art" data-a="arto" src="' + A + 'art-39208.webp" alt="" style="width:40px;height:64px">' +
      '<div><p class="frow__n">AW_Campaign_2024.AI</p><p class="frow__s num">21,3 MB</p></div></div>' +
      '</div>';
  }

  function quoteCard(x, y, w, mobile) {
    var lines = [[mobile ? 'Print <em>× 10</em>' : 'Print · NEPTUNE_Vinyl_345x543 <em>× 10</em>', '€420,00'],
                 ['Lamination <em>× 10</em>', '€90,00'], ['Cutting', '€45,00'], ['Packaging', '€25,00']];
    return '<div class="c" data-a="quote" style="' + at(x, y, w) + ';padding:18px 16px">' + LIFT +
      '<div class="ch"><span class="ch__tile">' + ic('quote') + '</span><p class="ch__t">Quote</p>' +
      '<span class="stack"><span class="pill pill--sent" data-a="sent">Sent</span><span class="pill pill--mint" data-a="accepted">Accepted</span></span></div>' +
      '<p class="qby" data-a="qby">Accepted by John Walters</p>' +
      lines.map(function (l, i) { return '<div class="ql" data-a="ql' + i + '"><span>' + l[0] + '</span><span class="num">' + l[1] + '</span></div>'; }).join('') +
      '<div class="qt" data-a="qt"><span>Total</span><span class="num" data-a="total">€580,00</span></div>' +
      '<div class="chips" style="margin-top:16px"><span class="chip">PayPal</span>' +
      '<span class="stack"><span class="chip">Credit card</span><span class="chip chip--on" data-a="cardon">Credit card' + ic('checkc') + '</span></span>' +
      (mobile ? '' : '<span class="chip">Wire transfer</span>') + '</div>' +
      '</div>';
  }

  function toast(key, x, y, w, kind, title, sub) {
    return '<div class="toast" data-a="' + key + '" style="' + at(x, y, w) + '">' +
      '<span class="toast__i toast__i--' + kind + '">' + ic(kind === 'ok' ? 'check' : 'bell') + '</span>' +
      '<div><p class="toast__t">' + title + '</p><p class="toast__s">' + sub + '</p></div>' + ic('close', 'ch__x') + '</div>';
  }

  /* a job card: an order, or one part of it, on the schedule */
  function job(o) {
    return '<div class="job' + (o.tok ? ' job--tok' : '') + '"' + (o.a ? ' data-a="' + o.a + '"' : '') + ' style="' + at(o.x, o.y, o.w, o.h) + '">' + LIFT +
      '<span class="job__bar" style="background:var(--o-' + o.order + ')"></span>' +
      '<img class="job__art" src="' + A + 'art-' + o.order + '.webp" alt="">' +
      '<div class="job__b"><p class="job__id">' + o.id + '</p>' + (o.nm ? '<p class="job__nm">' + o.nm + '</p>' : '') +
      (o.tok ? '<p class="job__sp">NEPTUNE_Vinyl_345x543</p><span class="faces"><img src="' + A + 'face-manel.webp" alt=""><img src="' + A + 'face-ada.webp" alt=""></span>' : '') +
      '</div>' + (o.tok ? ic('dots', 'job__dots') : '') + '</div>';
  }

  /* the schedule: Printer 1, Printer 2, Cutter 1, 09:00-12:00 */
  var LANE_X = [70, 230, 390], LANE_W = 154, T0 = 120, PX_H = 160;
  function ty(hhmm) { var p = hhmm.split(':'); return T0 + ((+p[0] - 9) + (+p[1]) / 60) * PX_H; }
  function slot(lane, from, to) { var y = ty(from) + 2; return { x: LANE_X[lane] + 4, y: y, w: LANE_W - 8, h: ty(to) - 2 - y }; }
  function ext(a, b) { for (var k in b) a[k] = b[k]; return a; }
  var STATIONS = [['Printer 1', 'HP Latex 800W', 'printer'], ['Printer 2', 'HP Latex 800W', 'printer'], ['Cutter 1', 'CutterX 231M', 'cutter']];

  function schedule() {
    var s = '';
    STATIONS.forEach(function (st, i) {
      s += '<div class="st" style="' + at(LANE_X[i], 24, LANE_W) + '"><img src="' + A + 'station-' + st[2] + '.webp" alt="">' +
        '<div><p class="st__n">' + st[0] + '</p><p class="st__m">' + st[1] + '</p></div>' +
        (i === 0 ? '<span class="st__ring" data-a="ring"></span>' : '') + '</div>';
    });
    ['09:00', '10:00', '11:00', '12:00'].forEach(function (t) {
      s += '<span class="tick num" style="' + at(20, ty(t)) + '">' + t + '</span>' +
           '<span class="grid" style="' + at(64, ty(t), 484) + '"></span>';
    });
    LANE_X.forEach(function (x) { s += '<span class="lane" style="' + at(x - 3, T0 - 16, null, 600 - T0 + 32) + '"></span>'; });
    s += job(ext(slot(0, '10:45', '12:00'), { order: '98410', id: '#98410', nm: 'Miro Beat Mondrian' }));
    s += job(ext(slot(1, '10:30', '12:00'), { order: '618716', id: '#618716', nm: 'Europeana Mar Rana' }));
    s += job(ext(slot(0, '09:30', '10:30'), { order: '39208', id: '#39208-01', nm: 'Print', a: 'p1' }));
    s += job(ext(slot(1, '09:30', '10:30'), { order: '39208', id: '#39208-02', nm: 'Print', a: 'p2' }));
    var y = ty('11:24');
    s += '<div data-a="now" style="position:absolute;inset:0"><span class="now" style="' + at(64, y, 484) + '"></span>' +
         '<span class="tpill num" style="' + at(12, y) + '">11:24</span></div>';
    return '<div data-a="sched" style="position:absolute;inset:0">' + s + '</div>';
  }

  function doneCard(x, y, w) {
    return '<div class="done" data-a="done" style="' + at(x, y, w) + '">' + LIFT +
      '<img class="art done__art" src="' + A + 'art-39208.webp" alt="">' +
      '<p class="done__id">#39208</p><p class="done__nm">Akatsuki Asuma Mogato</p><p class="done__sp">NEPTUNE_Vinyl_345x543</p>' +
      '<span class="due">' + ic('cal') + '<span class="stack num"><span data-a="due23">Due 23/04/2024</span><span data-a="due22">Due 22/04/2024</span></span></span>' +
      '<div class="slide" data-a="slide"><span class="knob" data-a="knob">' + ic('check') + '<span class="knob--ok" data-a="knobok">' + ic('check') + '</span></span>' +
      'Drag to mark done<span class="slide__chev"><span data-a="ch0">' + ic('chev') + '</span><span data-a="ch1">' + ic('chev') + '</span><span data-a="ch2">' + ic('chev') + '</span></span></div></div>';
  }

  function taskMenu(x, y, w) {
    var rows = [['assign', 'Assign'], ['pencil', 'Reminder notification'], ['calalert', 'Due date', 1], ['caltoday', 'Due date to today']];
    return '<div class="c menu" data-a="menu" style="' + at(x, y, w) + '">' +
      '<div class="ch"><p class="ch__t">Task actions</p>' + ic('close', 'ch__x') + '</div>' +
      rows.map(function (r) {
        return '<div class="mi">' + (r[2] ? '<span class="mi__hl" data-a="duehl"></span>' : '') + '<span class="mi__i">' + ic(r[0]) + '</span><span>' + r[1] + '</span></div>';
      }).join('') + '</div>';
  }

  function phone(x, y, w, h) {
    return '<div class="phone" data-a="phone" style="' + at(x, y, w, h) + '">' +
      '<div class="ph__h">' + ic('back') + '<p class="ph__id">#39208</p><p class="ph__c">24 comments</p></div>' +
      '<p class="ph__day">Today</p>' +
      '<div class="msg msg--new" data-a="amelie"><img src="' + A + 'face-amelie.webp" alt=""><div><p class="msg__n">Amélie Laurent</p><p class="msg__t">1 minute ago</p>' +
      '<p class="msg__b">Due date moved to 22/04 to make the carrier pickup.</p></div></div>' +
      '<div class="msg"><img src="' + A + 'face-manel.webp" alt=""><div><p class="msg__n">Manel Rodriguez</p><p class="msg__t">16h ago</p></div></div>' +
      '</div>';
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
    return '<div class="c" data-a="track" style="' + at(x, y, w) + ';padding:20px 24px 22px">' + LIFT +
      '<div class="ch" style="margin-left:104px;margin-bottom:22px"><span class="ch__tile">' + ic('pin') + '</span><p class="ch__t">Tracking</p></div>' +
      '<div class="trk"><i class="trk__fill" data-a="tfill"></i>' + nodes + '</div>' +
      '<div class="trk__labels">' + labels + '</div>' +
      '<p class="upd__h">Updates</p>' +
      '<div class="upd"><span class="h">Date</span><span class="h">Location</span><span class="h">Event</span>' +
      '<span class="r num" data-a="ur0">22/04/2024 - 17:56</span><span class="r" data-a="ur1">Sant Cugat, ES</span>' +
      '<span class="r" data-a="ur2"><span class="ev">Shipped</span><br>Carrier: Seur</span></div>' +
      '</div>';
  }

  function compactToken(x, y) {
    return '<div class="job" data-a="ctok" style="' + at(x, y, 128, 74) + ';box-shadow:var(--sh-lift)">' +
      '<span class="job__bar" style="background:var(--o-39208)"></span><img class="job__art" src="' + A + 'art-39208.webp" alt="" style="width:38px">' +
      '<div class="job__b" style="align-self:center"><p class="job__id" style="color:var(--navy);font-size:13px">#39208</p></div></div>';
  }

  /* --- engine ---------------------------------------------------------- */
  function bez(x1, y1, x2, y2) {
    function cx(t) { return 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t; }
    function cy(t) { return 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t; }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 24; i++) { t = (lo + hi) / 2; if (cx(t) < x) lo = t; else hi = t; }
      return cy(t);
    };
  }
  var OUT = bez(.22, 1, .36, 1), INOUT = bez(.65, 0, .35, 1), LIN = function (p) { return p; };
  var DEF = { x: 0, y: 0, s: 1, sx: 1, sy: 1, o: 1, l: 0 };
  var PROPS = ['x', 'y', 's', 'sx', 'sy', 'o', 'l'];

  /* keys: [[time, {props}, ease], ...] -- ease shapes the segment arriving at
     that key. Props not given carry over from the previous key. */
  function Track(el, keys) {
    this.el = el; this.lift = el.querySelector(':scope > .pm-lift'); this.last = ''; this.k = [];
    var prev = DEF;
    keys.sort(function (a, b) { return a[0] - b[0]; });
    for (var i = 0; i < keys.length; i++) {
      var v = {}; for (var j = 0; j < PROPS.length; j++) { var p = PROPS[j]; v[p] = p in keys[i][1] ? keys[i][1][p] : prev[p]; }
      this.k.push({ t: keys[i][0], v: v, e: keys[i][2] || OUT }); prev = v;
    }
  }
  Track.prototype.at = function (t) {
    var k = this.k;
    if (t <= k[0].t) return k[0].v;
    for (var i = 1; i < k.length; i++) {
      if (t < k[i].t) {
        var a = k[i - 1], b = k[i], p = b.e((t - a.t) / (b.t - a.t)), v = {};
        for (var j = 0; j < PROPS.length; j++) { var n = PROPS[j]; v[n] = a.v[n] + (b.v[n] - a.v[n]) * p; }
        return v;
      }
    }
    return k[k.length - 1].v;
  };
  Track.prototype.apply = function (t) {
    var v = this.at(t);
    var tr = (v.x || v.y ? 'translate(' + v.x.toFixed(2) + 'px,' + v.y.toFixed(2) + 'px)' : '') +
             (v.s * v.sx !== 1 || v.s * v.sy !== 1 ? ' scale(' + (v.s * v.sx).toFixed(4) + ',' + (v.s * v.sy).toFixed(4) + ')' : '');
    var key = tr + '|' + v.o.toFixed(3) + '|' + v.l.toFixed(3);
    if (key === this.last) return;
    this.last = key;
    this.el.style.transform = tr;
    this.el.style.opacity = v.o >= 0.999 ? '' : v.o.toFixed(3);
    this.el.style.visibility = v.o <= 0.001 ? 'hidden' : '';
    if (this.lift) this.lift.style.opacity = v.l.toFixed(3);
  };

  /* geometry in stage coordinates, measured before any transform is applied */
  function rect(el, stage) {
    var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = s.width / stage.offsetWidth;
    return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
  }
  /* the transform that puts element B exactly over rect A (center origin) */
  function from(a, b) {
    /* uniform scale: a non-uniform one would stretch the type mid-morph */
    var k = Math.sqrt((a.w / b.w) * (a.h / b.h));
    return { x: (a.x + a.w / 2) - (b.x + b.w / 2), y: (a.y + a.h / 2) - (b.y + b.h / 2), sx: k, sy: k };
  }
  /* part-way along a morph: the outgoing card holds full opacity while it
     travels, so the order is never shown by two half-faded copies */
  function part(f, p) { return { x: f.x * p, y: f.y * p, sx: 1 + (f.sx - 1) * p, sy: 1 + (f.sy - 1) * p }; }
  function m(o, extra) { var r = {}; for (var k in o) r[k] = o[k]; for (k in extra) r[k] = extra[k]; return r; }

  /* in-out for a fade that is part of a stage, used everywhere */
  function enter(t0, d, fromP) { return [[t0, m({ o: 0 }, fromP || {})], [t0 + d, { o: 1, x: 0, y: 0, s: 1, sx: 1, sy: 1 }]]; }

  /* --- desktop choreography ------------------------------------------- */
  function desktopTracks(q, stage) {
    var T = [];
    function tr(name, keys) { var el = q(name); if (el) T.push(new Track(el, keys)); }

    /* positions that depend on layout */
    var up = q('up'), pill = q('pill');
    var dropi = rect(q('dropi'), stage);
    pill.style.left = (dropi.x + dropi.w + 12) + 'px';
    pill.style.top = (dropi.y + dropi.h / 2 - 15) + 'px';
    var rArtU = rect(q('artu'), stage), rArtO = rect(q('arto'), stage);
    var rOrder = rect(q('order'), stage), rTok = rect(q('tok'), stage);
    var rP = [rect(q('p1'), stage), rect(q('p2'), stage), rect(q('p3'), stage)];
    var rDone = rect(q('done'), stage), rTrack = rect(q('track'), stage);
    var slide = q('slide'), travel = slide.offsetWidth - 12 - 44;
    var fly = q('fly');
    fly.style.left = rArtO.x + 'px'; fly.style.top = rArtO.y + 'px'; fly.style.width = rArtO.w + 'px'; fly.style.height = rArtO.h + 'px';

    /* Stage 1 -- Accounts (0-5.5) */
    tr('up', enter(0, .7, { y: 24 }).concat([[2.1, { o: 1, y: 0 }], [2.6, { o: 0, y: -12 }]]));
    tr('pill', [[0, { o: 0, x: 150, y: 214 }], [.7, { o: 1, x: 150, y: 190 }], [.85, { s: 1.04, l: 1, x: 120, y: 150 }],
                [1.3, { s: 1, l: 0, x: 0, y: 0 }], [1.45, { o: 0 }, LIN]]);
    tr('prow', [[1.3, { o: 0, y: 8 }], [1.6, { o: 1, y: 0 }]]);
    tr('pfill', [[1.3, { sx: 0 }], [1.95, { sx: 1 }, INOUT]]);
    tr('pbar', [[1.95, { o: 1 }], [2.1, { o: 0 }, LIN]]);
    tr('pcheck', [[1.95, { o: 0, s: .7 }], [2.1, { o: 1, s: 1 }]]);
    tr('artu', [[2.1, { o: 1 }], [2.12, { o: 0 }, LIN]]);
    var f = from(rArtU, rArtO);
    tr('fly', [[2.09, { o: 0 }], [2.1, m(f, { o: 1, l: 1 }), LIN], [2.75, { o: 1, x: 0, y: 0, sx: 1, sy: 1, l: 0 }], [2.8, { o: 0 }, LIN]]);
    tr('arto', [[2.75, { o: 0 }], [2.8, { o: 1 }, LIN]]);
    var fo = from(rTok, rOrder);
    tr('order', enter(2.1, .6, { y: 16 }).concat([[5.5, { o: 1 }],
      [5.85, m(part(fo, .6), { o: 1, l: 1 })], [6.15, m(fo, { o: 0, l: 1 })]]));
    tr('queued', [[4.4, { o: 0, s: .85 }], [4.8, { o: 1, s: 1 }]]);
    tr('quote', enter(2.8, .6, { x: 32 }).concat([[5.5, { o: 1 }], [5.9, { o: 0, x: 24 }]]));
    for (var i = 0; i < 4; i++) tr('ql' + i, [[2.95 + i * .06, { o: 0, y: 6 }], [3.35 + i * .06, { o: 1, y: 0 }]]);
    tr('qt', [[3.2, { o: 0, y: 6 }], [3.5, { o: 1, y: 0 }]]);
    tr('sent', [[3.8, { o: 1 }], [4.0, { o: 0 }]]);
    tr('accepted', [[3.9, { o: 0, s: .9 }], [4.25, { o: 1, s: 1 }]]);
    tr('qby', [[3.95, { o: 0, y: -4 }], [4.35, { o: 1, y: 0 }]]);
    tr('cardon', [[4.0, { o: 0 }], [4.3, { o: 1 }]]);
    tr('t1', enter(4.4, .45, { x: -24, y: 24 }).concat([[5.5, { o: 1 }], [5.9, { o: 0, y: 16 }]]));

    /* Stage 2 -- Production (5.5-10) */
    tr('tok', [[5.5, m(from(rOrder, rTok), { o: 0, l: 1 })], [5.65, { o: 1 }, LIN], [6.15, { x: 0, y: 0, sx: 1, sy: 1, l: 0 }],
               [6.85, { o: 1 }], [7.05, { o: 0 }, LIN]]);
    tr('sched', [[6.2, { o: 0 }], [6.8, { o: 1 }], [10, { o: 1, s: 1 }], [10.7, { o: .18, s: .96 }], [14.5, { o: .18 }], [14.9, { o: 0 }]]);
    ['p1', 'p2', 'p3'].forEach(function (n, i) {
      var t0 = 6.8 + i * .12, k = [[t0, m(from(rTok, rP[i]), { o: 0, l: 1 })], [t0 + .15, { o: 1 }, LIN],
                                   [t0 + .6, { x: 0, y: 0, sx: 1, sy: 1, l: 0 }]];
      if (n === 'p3') k.push([10, { o: 1 }], [10.65, m(from(rDone, rP[2]), { o: 0, l: 1 })]);
      tr(n, k);
    });
    tr('now', [[7.8, { o: 0, y: ty('09:00') - ty('11:24') }], [7.9, { o: 1 }, LIN], [8.8, { y: 0 }, INOUT]]);
    tr('ring', [[8.8, { o: 0 }], [9.3, { o: 1 }]]);

    /* Stage 3 -- Operations (10-14.5) */
    tr('done', [[10, m(from(rP[2], rDone), { o: 0, l: 1 })], [10.25, { o: 1 }, LIN], [10.65, { x: 0, y: 0, sx: 1, sy: 1, l: 0 }],
                [14.5, { o: 1 }], [14.85, m(part(from(rTrack, rDone), .55), { o: 1, l: 1 })],
                [15.15, m(from(rTrack, rDone), { o: 0, l: 1 })]]);
    tr('menu', enter(10.7, .5, { s: .96, y: 8 }).concat([[14.5, { o: 1 }], [14.8, { o: 0, s: .97 }]]));
    tr('duehl', [[11.0, { o: 0 }], [11.3, { o: 1 }]]);
    tr('due23', [[11.1, { o: 1, y: 0 }], [11.45, { o: 0, y: -10 }]]);
    tr('due22', [[11.15, { o: 0, y: 10 }], [11.5, { o: 1, y: 0 }]]);
    tr('phone', enter(11.5, .8, { x: 120 }).concat([[14.5, { o: 1 }], [14.9, { o: 0, x: 80 }]]));
    tr('amelie', [[11.95, { o: 0, y: -8 }], [12.4, { o: 1, y: 0 }]]);
    tr('knob', [[12.5, { x: 0 }], [13.3, { x: travel }, INOUT]]);
    tr('knobok', [[13.3, { o: 0 }], [13.5, { o: 1 }]]);
    for (i = 0; i < 3; i++) {
      var c0 = 12.5 + i * .1;
      tr('ch' + i, [[c0, { o: 1 }], [c0 + .2, { o: .25 }, INOUT], [c0 + .4, { o: 1 }, INOUT], [c0 + .6, { o: .25 }, INOUT], [c0 + .8, { o: 1 }, INOUT]]);
    }

    /* Stage 4 -- Shipping (14.5-19) */
    tr('track', [[14.5, m(from(rDone, rTrack), { o: 0, l: 1 })], [14.7, { o: 1 }, LIN], [15.15, { x: 0, y: 0, sx: 1, sy: 1, l: 0 }],
                 [FILL_END, { o: 1 }], [END, { o: 0 }]]);
    tr('ctok', [[14.5, { o: 0, s: .8 }], [14.8, { o: 1, s: 1 }], [FILL_END, { o: 1 }], [END, { o: 0 }]]);
    tr('tfill', [[15.2, { sx: 0 }], [16.7, { sx: 2 / 3 }, INOUT]]);
    [15.2, 15.95, 16.6].forEach(function (t0, i) {
      tr('tn' + i, [[t0, { o: 0, s: .6 }], [t0 + .15, { o: 1, s: 1 }]]);
      tr('td' + i, [[t0, { o: 0 }], [t0 + .25, { o: 1 }]]);
    });
    for (i = 0; i < 3; i++) tr('ur' + i, [[16.7 + i * .06, { o: 0, y: 6 }], [17.2 + i * .06, { o: 1, y: 0 }]]);
    tr('t2', enter(17.3, .45, { x: -24, y: 24 }).concat([[FILL_END, { o: 1 }], [END, { o: 0 }]]));

    captionTracks(tr);
    return T;
  }

  function captionTracks(tr) {
    for (var i = 0; i < 4; i++) {
      var a = S[i], b = i < 3 ? S[i + 1] : FILL_END;
      tr('cap' + i, [[a, { o: 0 }], [a + .4, { o: 1 }], [b, { o: 1 }], [b + .3, { o: 0 }]]);
    }
  }

  /* --- mobile choreography -------------------------------------------- */
  function mobileTracks(q) {
    var T = [];
    function tr(name, keys) { var el = q(name); if (el) T.push(new Track(el, keys)); }
    var slide = q('slide'), travel = slide.offsetWidth - 12 - 44;

    tr('mtok', [[0, { o: 0, y: 12 }], [.5, { o: 1, y: 0 }], [FILL_END, { o: 1 }], [END, { o: 0 }]]);
    for (var i = 0; i < 4; i++) {
      var a = S[i] + (i ? .1 : .2), b = i < 3 ? S[i + 1] : FILL_END;
      tr('mp' + i, [[a, { o: 0, y: 16 }], [a + .5, { o: 1, y: 0 }], [b, { o: 1 }], [b + .3, { o: 0, y: -8 }]]);
    }
    for (i = 0; i < 4; i++) tr('ql' + i, [[.7 + i * .06, { o: 0, y: 6 }], [1.1 + i * .06, { o: 1, y: 0 }]]);
    tr('sent', [[3.8, { o: 1 }], [4.0, { o: 0 }]]);
    tr('accepted', [[3.9, { o: 0, s: .9 }], [4.25, { o: 1, s: 1 }]]);
    tr('qby', [[3.95, { o: 0, y: -4 }], [4.35, { o: 1, y: 0 }]]);
    tr('cardon', [[4.0, { o: 0 }], [4.3, { o: 1 }]]);
    for (i = 0; i < 3; i++) tr('sr' + i, [[6.8 + i * .12, { o: 0, x: 16 }], [7.3 + i * .12, { o: 1, x: 0 }]]);
    tr('due23', [[11.1, { o: 1, y: 0 }], [11.45, { o: 0, y: -10 }]]);
    tr('due22', [[11.15, { o: 0, y: 10 }], [11.5, { o: 1, y: 0 }]]);
    tr('knob', [[12.5, { x: 0 }], [13.3, { x: travel }, INOUT]]);
    tr('knobok', [[13.3, { o: 0 }], [13.5, { o: 1 }]]);
    for (i = 0; i < 3; i++) {
      var c0 = 12.5 + i * .1;
      tr('ch' + i, [[c0, { o: 1 }], [c0 + .2, { o: .25 }, INOUT], [c0 + .4, { o: 1 }, INOUT], [c0 + .6, { o: .25 }, INOUT], [c0 + .8, { o: 1 }, INOUT]]);
    }
    tr('vfill', [[15.2, { sy: 0 }], [16.7, { sy: 2 / 3 }, INOUT]]);
    [15.2, 15.95, 16.6].forEach(function (t0, i) {
      tr('tn' + i, [[t0, { o: 0, s: .6 }], [t0 + .15, { o: 1, s: 1 }]]);
      tr('td' + i, [[t0, { o: 0 }], [t0 + .25, { o: 1 }]]);
    });
    tr('ur0', [[16.7, { o: 0, y: 6 }], [17.2, { o: 1, y: 0 }]]);
    captionTracks(tr);
    return T;
  }

  /* --- frames ---------------------------------------------------------- */
  function desktopStage() {
    return uploadCard(60, 70, 448) + dropPill() +
      orderCard(20, 24, 296) + quoteCard(240, 232, 308) + toast('t1', 20, 540, 340, 'req', 'New request for approval', 'Sent by Account Manager') +
      schedule() +
      job({ x: 100, y: 236, w: 368, order: '39208', id: '#39208', nm: 'Akatsuki Asuma Mogato', tok: true, a: 'tok' }) +
      job(ext(slot(2, '10:30', '11:30'), { order: '39208', id: '#39208-03', nm: 'Cutting', a: 'p3' })) +
      doneCard(24, 48, 296) + taskMenu(24, 330, 290) + phone(330, 24, 250, 680) +
      trackingCard(20, 128, 528) + compactToken(10, 92) +
      toast('t2', 20, 510, 360, 'ok', 'Order #39208 Shipped', 'Sent by Production Manager') +
      '<img class="art at" data-a="fly" src="' + A + 'art-39208.webp" alt="">';
  }

  function mobileStage() {
    var split = [['p1', '#39208-01', '09:30–10:30'], ['p2', '#39208-02', '09:30–10:30'], ['p3', '#39208-03', '10:30–11:30']];
    var rows = STATIONS.map(function (st, i) {
      return '<div class="srow" data-a="sr' + i + '"><img src="' + A + 'station-' + st[2] + '.webp" alt="">' +
        '<div class="srow__b"><p class="st__n">' + st[0] + '</p><p class="st__m num">' + split[i][2] + '</p></div>' +
        '<span class="mjob"><span class="job__bar" style="background:var(--o-39208)"></span><img src="' + A + 'art-39208.webp" alt="">' + split[i][1] + '</span></div>';
    }).join('');
    var vrows = TRACK.map(function (l, i) {
      return '<div class="vrow"><span class="trk__n" style="left:-22px"></span>' +
        (i < 3 ? '<span class="trk__n trk__n--on" data-a="tn' + i + '" style="left:-22px">' + ic('check') + '</span>' : '') +
        '<p>' + l[0] + '</p><p class="vrow__d num"' + (i < 3 ? ' data-a="td' + i + '"' : '') + '>' + l[1] + (l[2] ? '<br>' + l[2] : '') + '</p></div>';
    }).join('');
    return '<div class="mtok" data-a="mtok"><span class="job__bar" style="background:var(--o-39208)"></span>' +
        '<img class="job__art" src="' + A + 'art-39208.webp" alt=""><div class="job__b"><p class="job__id">#39208</p><p class="job__nm">Akatsuki Asuma Mogato</p></div></div>' +
      '<div class="mp" data-a="mp0">' + quoteCard(0, 0, 292, true) + '</div>' +
      '<div class="mp" data-a="mp1"><div class="c" style="padding:8px 16px">' + rows + '</div></div>' +
      '<div class="mp" data-a="mp2">' + doneCard(0, 0, 292) + '</div>' +
      '<div class="mp" data-a="mp3"><div class="c"><div class="ch"><span class="ch__tile">' + ic('pin') + '</span><p class="ch__t">Tracking</p></div>' +
        '<div class="vtrk"><span class="vtrk__bar"><i class="vtrk__fill" data-a="vfill"></i></span>' + vrows + '</div>' +
        '<div class="upd" style="grid-template-columns:1fr auto;margin-top:6px"><span class="r num" data-a="ur0" style="text-align:left">22/04/2024 - 17:56<br>Sant Cugat, ES</span>' +
        '<span class="r" style="text-align:right"><span class="ev">Shipped</span><br>Carrier: Seur</span></div></div></div>';
  }

  /* Build a frame. Returns the element plus seek(); call init() once it is in
     the document, since the tracks are measured from real layout. */
  function create(mobile) {
    var el = document.createElement('div');
    el.className = 'pm' + (mobile ? ' pm--m' : '');
    el.innerHTML = rail() + '<div class="pm__anim" aria-hidden="true">' + captions() +
      '<div class="pm__stage">' + (mobile ? mobileStage() : desktopStage()) + '</div></div>' +
      '<p class="pm-sr">' + DESCRIPTION + '</p>';
    var stage = el.querySelector('.pm__stage');
    var nodes = Array.prototype.slice.call(el.querySelectorAll('.pm__node'));
    var fill = el.querySelector('.pm__fill');
    var total = el.querySelector('[data-a="total"]');
    var tracks = [], current = -1, lastFill = '';
    function q(n) { return el.querySelector('[data-a="' + n + '"]'); }

    function stageAt(t) { return t >= S[3] ? 3 : t >= S[2] ? 2 : t >= S[1] ? 1 : 0; }
    function setStage(i) {
      if (i === current) return;
      current = i;
      nodes.forEach(function (n, k) {
        if (k === i) n.setAttribute('aria-current', 'step'); else n.removeAttribute('aria-current');
        if (k < i) n.setAttribute('data-done', ''); else n.removeAttribute('data-done');
      });
    }
    function railFill(t) {
      if (t >= FILL_END) return 1 - INOUT((t - FILL_END) / (END - FILL_END));
      var i = stageAt(t), b = i < 3 ? S[i + 1] : FILL_END;
      return (i + (t - S[i]) / (b - S[i])) / 4;
    }
    function seek(t) {
      for (var i = 0; i < tracks.length; i++) tracks[i].apply(t);
      setStage(stageAt(Math.min(t, FILL_END - .001)));
      var f = 'scaleX(' + railFill(t).toFixed(4) + ')';
      if (f !== lastFill) { fill.style.transform = f; lastFill = f; }
      if (total) {
        var p = OUT(Math.max(0, Math.min(1, (t - 3.2) / .6)));
        var v = mobile ? 580 : Math.round(580 * p);
        var txt = '€' + v + ',00';
        if (total.textContent !== txt) total.textContent = txt;
      }
    }
    function init() {
      tracks.forEach(function (tr) { tr.el.style.transform = ''; tr.el.style.opacity = ''; tr.el.style.visibility = ''; });
      tracks = mobile ? mobileTracks(q) : desktopTracks(q, stage);
    }
    return { el: el, seek: seek, init: init, nodes: nodes, pp: el.querySelector('.pm__pp'), mobile: mobile };
  }

  /* --- the live component on the page --------------------------------- */
  function mount(host) {
    var narrow = window.matchMedia('(max-width: 767px)');
    var still = window.matchMedia('(prefers-reduced-motion: reduce)');
    var f = null, t = FRAME_T[0], userPaused = false, inView = false, hover = false, raf = 0, prev = 0;

    function playing() { return !userPaused && inView && !hover && !document.hidden && !(still.matches && !userPlayed); }
    var userPlayed = false;

    function scale() {
      if (!f) return;
      var W = f.mobile ? 340 : 600, H = f.mobile ? 600 : 760, k = host.clientWidth / W;
      f.el.style.transform = 'scale(' + k + ')';
      host.style.height = (H * k) + 'px';
    }
    function label() {
      var on = !userPaused && !(still.matches && !userPlayed);
      f.pp.setAttribute('aria-label', on ? 'Pause animation' : 'Play animation');
      f.pp.innerHTML = ic(on ? 'pause' : 'play');
    }
    function tick(now) {
      raf = 0;
      if (!playing()) return;
      var dt = prev ? Math.min(.1, (now - prev) / 1000) : 0;
      prev = now;
      t = (t + dt) % END;
      f.seek(t);
      raf = requestAnimationFrame(tick);
    }
    function sync() {
      if (playing() && !raf) { prev = 0; raf = requestAnimationFrame(tick); }
      if (!playing() && raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    function build() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      host.innerHTML = '';
      f = create(narrow.matches);
      host.appendChild(f.el);
      scale();
      f.init();
      if (still.matches && !userPlayed) t = FRAME_T[0];
      f.seek(t);
      f.nodes.forEach(function (n, i) {
        n.addEventListener('click', function () { t = FRAME_T[i]; userPaused = true; f.seek(t); label(); sync(); });
      });
      f.pp.addEventListener('click', function () {
        var on = !userPaused && !(still.matches && !userPlayed);
        if (on) userPaused = true; else { userPaused = false; userPlayed = true; }
        label(); sync();
      });
      f.el.addEventListener('mouseenter', function () { hover = true; sync(); });
      f.el.addEventListener('mouseleave', function () { hover = false; sync(); });
      label();
      sync();
    }

    new IntersectionObserver(function (es) { inView = es[0].intersectionRatio >= .5; sync(); }, { threshold: [0, .5, 1] }).observe(host);
    if (window.ResizeObserver) new ResizeObserver(scale).observe(host);
    document.addEventListener('visibilitychange', sync);
    function onChange() { build(); }
    (narrow.addEventListener ? narrow.addEventListener('change', onChange) : narrow.addListener(onChange));
    (still.addEventListener ? still.addEventListener('change', function () { userPlayed = false; build(); }) : 0);
    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (f) { f.init(); f.seek(t); } });
  }

  /* storyboard / QA: a standalone frame at stage n's final frame, or time t */
  function frame(n, opts) {
    opts = opts || {};
    var f = create(!!opts.mobile);
    (opts.into || document.body).appendChild(f.el);
    f.init();
    f.seek(opts.t != null ? opts.t : FRAME_T[n]);
    return f;
  }

  window.Promo = { frame: frame, create: create, STAGES: STAGES, FRAME_T: FRAME_T, END: END, FILL_END: FILL_END };

  function boot() { var h = document.querySelector('.pmr__vis'); if (h) mount(h); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
