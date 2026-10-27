/* A password-locked page -- the browser half of tools/encrypt-page.mjs.
 *
 * The page ships a form and an encrypted payload (data-payload on the form).
 * The password derives the key (PBKDF2-SHA-256, 600,000 iterations) and
 * AES-GCM opens the payload; a wrong password fails GCM's check, so nothing
 * readable exists without it. On success the gate is taken down -- the site's
 * own stylesheets too, since the page brings its own -- and the decrypted
 * build is mounted on #root: its files as blob URLs (their URLs rewritten in
 * the JS and CSS), its CSS, then its script.
 *
 * The key (never the password) is kept in sessionStorage, so a reload in the
 * same tab opens straight away; it goes when the tab closes.
 */
(function () {
  'use strict';

  var ITER = 600000;
  var form = document.querySelector('.lock');
  if (!form) return;
  var input = form.querySelector('input[type="password"]');
  var status = form.querySelector('.lock__status');
  var url = form.getAttribute('data-payload');
  var KEEP = 'locked:' + url;
  var payload = null;

  function say(text, bad) {
    status.textContent = text;
    if (bad) form.setAttribute('data-bad', ''); else form.removeAttribute('data-bad');
  }
  function bytes() {
    if (!payload) payload = fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('payload ' + r.status);
      return r.arrayBuffer();
    }).then(function (b) {
      var u = new Uint8Array(b);
      if (String.fromCharCode(u[0], u[1], u[2], u[3]) !== 'MFY1') throw new Error('not a payload');
      return { salt: u.slice(4, 20), iv: u.slice(20, 32), ct: u.slice(32) };
    });
    return payload;
  }
  function derive(pw, salt) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: ITER }, base,
        { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
    });
  }
  function gunzip(buf) {
    return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  function b64(u) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }

  function open(key, p) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: p.iv }, key, p.ct).then(gunzip);
  }

  function mount(buf) {
    var u = new Uint8Array(buf), dv = new DataView(buf);
    var hl = dv.getUint32(0), head = JSON.parse(new TextDecoder().decode(u.subarray(4, 4 + hl)));
    var at = 4 + hl, js = '', css = '', files = [];
    head.entries.forEach(function (e) {
      var part = u.subarray(at, at + e.size); at += e.size;
      if (e.name === 'js') js = new TextDecoder().decode(part);
      else if (e.name === 'css') css = new TextDecoder().decode(part);
      else files.push({ url: e.url, href: URL.createObjectURL(new Blob([part], { type: e.type })) });
    });
    files.forEach(function (f) { js = js.split(f.url).join(f.href); css = css.split(f.url).join(f.href); });

    /* take the gate down: its markup, and the site's styles and fonts */
    Array.prototype.slice.call(document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], style')).forEach(function (n) { n.remove(); });
    document.body.className = '';
    document.body.innerHTML = '<div id="root"></div>';
    document.documentElement.setAttribute('data-unlocked', '');
    if (css) {
      var st = document.createElement('style');
      st.textContent = css;
      document.head.appendChild(st);
    }
    var s = document.createElement('script');
    s.src = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
    document.body.appendChild(s);
  }

  function fail(err) {
    form.removeAttribute('aria-busy');
    input.disabled = false;
    if (err && err.name === 'OperationError') { say('That password doesn’t open it.', true); input.select(); }
    else { say('It couldn’t load. Try again in a moment.', true); payload = null; }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!input.value) { input.focus(); return; }
    form.setAttribute('aria-busy', 'true');
    input.disabled = true;
    say('Opening…');
    var pw = input.value, key;
    bytes().then(function (p) {
      return derive(pw, p.salt).then(function (k) { key = k; return open(k, p); });
    }).then(function (buf) {
      crypto.subtle.exportKey('raw', key).then(function (raw) {
        try { sessionStorage.setItem(KEEP, b64(new Uint8Array(raw))); } catch (x) {}
      });
      mount(buf);
    }).catch(fail);
  });
  input.addEventListener('input', function () { if (form.hasAttribute('data-bad')) say(''); });

  /* a reload in the same tab: open with the kept key, or forget it */
  var kept = null;
  try { kept = sessionStorage.getItem(KEEP); } catch (x) {}
  if (kept) {
    form.setAttribute('aria-busy', 'true');
    input.disabled = true;
    say('Opening…');
    Promise.all([bytes(), crypto.subtle.importKey('raw', unb64(kept), 'AES-GCM', false, ['decrypt'])])
      .then(function (r) { return open(r[1], r[0]); })
      .then(mount)
      .catch(function () {
        try { sessionStorage.removeItem(KEEP); } catch (x) {}
        form.removeAttribute('aria-busy'); input.disabled = false; say('');
      });
  }
})();
