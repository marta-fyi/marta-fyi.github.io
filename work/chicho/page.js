/* Chicho -- the live app in its phone, beside the case study.
 *
 * A trimmed copy of chicho-meals/frame.js: the real app runs in an iframe at
 * an iPhone 16 Pro's 402x874 viewport (?app&inframe gives it that phone's
 * safe areas), with the status bar and home indicator drawn over it in the
 * app's theme. The whole phone scales to the column's width and the window's
 * height, never above PHONE_MAX tall. In the wide layout it starts level with
 * the title and pins there (promo.css's -100vh pull needs a long page). Unlike frame.js it never focuses the app, so the page
 * doesn't jump, and the iframe loads lazily (at once in the wide layout).
 *
 * Nothing a visitor does here is kept: the frame shares marta.fyi/chicho's
 * storage, so Chicho's keys are cleared before the app loads and again when
 * the page goes, and every reload starts at the welcome.
 *
 * Phones and upright tablets keep the page's still and link: no phone inside
 * a phone.
 */
(function () {
  var PHONE_W = 402 + 2 * (12 + 3), PHONE_H = 874 + 2 * (12 + 3), PHONE_MAX = 760, ROOM_Y = 48;
  var WIDE = matchMedia('(min-width: 1200px)'), SMALL = matchMedia('(max-width: 767px), (orientation: portrait) and (max-width: 1023px)');

  var SIGNAL = '<svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>';
  var WIFI = '<svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .5 10.4 10.4 0 0 0 .8 3.4L2 4.7a8.6 8.6 0 0 1 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.4l1.2-1.3A6.6 6.6 0 0 0 8 4.1a6.6 6.6 0 0 0-4.6 1.9l1.2 1.3c.9-.9 2.1-1.4 3.4-1.4Zm0 3.5c-.5 0-1 .2-1.3.5L8 11.5l1.3-1.6c-.3-.3-.8-.5-1.3-.5Z"/></svg>';
  var BATTERY = '<svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity=".4"/></svg>';

  // every key Chicho keeps (chicho-meals: STORE_KEY in index.html, kitchen.js, sortfood.js)
  var KEYS = { local: ['toddlerMealPlanner.v1'], session: ['chicho.kitchenView', 'sortTab'] };
  function forget() {
    try { KEYS.local.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    try { KEYS.session.forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) {}
  }

  var host, still, box, phone, frame, clock, watching = null;

  function build() {
    still.hidden = true;
    host.insertAdjacentHTML('beforeend',
      '<div class="chf-box"><div class="chf-phone">' +
        '<i class="chf-btn l action"></i><i class="chf-btn l volup"></i><i class="chf-btn l voldown"></i>' +
        '<i class="chf-btn r side"></i><i class="chf-btn r camera"></i>' +
        '<div class="chf-bezel"><div class="chf-screen">' +
          '<iframe title="Chicho, live" loading="lazy" allow="clipboard-write"></iframe>' +
          '<div class="chf-status" aria-hidden="true"><span class="chf-time"></span><span></span><span class="chf-icons">' + SIGNAL + WIFI + BATTERY + '</span></div>' +
          '<div class="chf-island" aria-hidden="true"></div>' +
          '<div class="chf-home" aria-hidden="true"></div>' +
        '</div></div>' +
      '</div></div>');
    box = host.querySelector('.chf-box'); phone = host.querySelector('.chf-phone');
    frame = host.querySelector('iframe'); clock = host.querySelector('.chf-time');

    // the app's theme (Auto, Light or Dark) colours the status bar and the home indicator
    frame.addEventListener('load', function () {
      if (watching) watching.disconnect();
      try {
        var root = frame.contentDocument.documentElement;
        var sync = function () { host.dataset.theme = root.dataset.theme === 'dark' ? 'dark' : 'light'; };
        sync();
        watching = new MutationObserver(sync);
        watching.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
      } catch (e) {}
    });
    forget();
    addEventListener('pagehide', forget);
    frame.src = '/chicho/index.html?app&inframe';
    tick();
  }

  // the whole phone, scaled to its column and the window's height (never above PHONE_MAX, never above its real size);
  // wide, it starts level with the title and pins there, so it must fit below that line
  function fit() {
    var room = innerHeight - ROOM_Y, top = 0;
    host.style.marginTop = ''; host.style.top = '';
    if (WIDE.matches) {
      host.style.marginTop = '0px'; host.style.top = 'auto';   // measured where it would sit, without the pull or the pin
      var title = document.querySelector('.study h1').getBoundingClientRect().top + scrollY;
      top = Math.max(24, title);
      host.style.marginTop = title - (host.getBoundingClientRect().top + scrollY) + 'px';
      host.style.top = top + 'px';
      room = innerHeight - top - 32;
    }
    var k = Math.min(PHONE_MAX / PHONE_H, room / PHONE_H, host.clientWidth / PHONE_W);
    phone.style.transform = 'scale(' + k + ')';
    box.style.width = PHONE_W * k + 'px'; box.style.height = PHONE_H * k + 'px';
  }

  // the status bar's clock: the hour and minutes, as the phone shows them (no AM/PM)
  var fmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  function tick() {
    clock.textContent = fmt.formatToParts(new Date()).filter(function (p) {
      return p.type === 'hour' || p.type === 'minute' || (p.type === 'literal' && p.value.trim() === ':');
    }).map(function (p) { return p.value; }).join('');
    setTimeout(tick, 60000 - Date.now() % 60000);
  }

  function update() {
    if (SMALL.matches) { if (box) { box.hidden = true; still.hidden = false; } return; }
    if (!box) build();
    box.hidden = false; still.hidden = true;
    fit();
  }

  function boot() {
    host = document.querySelector('.chf'); if (!host) return;
    still = host.querySelector('.chf-still');
    update();
    addEventListener('resize', update);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
