// Browsers without scroll-driven animations get the same rotation from JS.
const mark = document.querySelector('.spinner');
if (mark &&
    !CSS.supports('animation-timeline: scroll()') &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let pending = false;
  const turn = () => {
    pending = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    mark.style.transform = `rotate(${progress * 720}deg)`;
  };
  window.addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(turn); }
  }, { passive: true });
  turn();
}

// Email copies to the clipboard; the glyph confirms it briefly.
const copyBtn = document.querySelector('.copy');
const copyStatus = document.querySelector('footer [role="status"]');
let resetGlyph;
copyBtn?.addEventListener('click', async () => {
  const text = copyBtn.dataset.clip;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Older browsers, or a non-secure context.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  copyBtn.dataset.copied = '';
  copyStatus.textContent = 'Email address copied';
  clearTimeout(resetGlyph);
  resetGlyph = setTimeout(() => {
    delete copyBtn.dataset.copied;
    copyStatus.textContent = '';
  }, 1600);
});

// Back-to-top mascot on the homepage. The href="#top" anchor is the no-JS
// fallback; this keeps the hash out of the URL and eases the scroll.
const toTop = document.querySelector('.home[href="#top"]');
toTop?.addEventListener('click', event => {
  event.preventDefault();
  if (window.glideTo) { window.glideTo('first'); return; }
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
});

// Homepage nudge: after five seconds without scrolling, a blinking arrow says
// there is more below. Any scroll hides it and restarts the wait; at the bottom
// it stays away. Clicking moves down a screen and the snap picks the section.
const nudge = document.querySelector('.nudge');
if (nudge) {
  let idle;
  const atBottom = () =>
    window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2;
  const wait = () => {
    nudge.hidden = true;
    clearTimeout(idle);
    idle = setTimeout(() => { nudge.hidden = atBottom(); }, 5000);
  };
  window.addEventListener('scroll', wait, { passive: true });
  wait();
  nudge.addEventListener('click', () => {
    if (window.glideTo) { window.glideTo(1); return; }
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollBy({ top: window.innerHeight, behavior: smooth ? 'smooth' : 'auto' });
  });
}

// Homepage glide: with a mouse or trackpad, one wheel or trackpad swipe (or an
// arrow key, Page Up/Down, Space) moves one section, eased over GLIDE_MS --
// slower than the browser's own snap, which can't be timed. The stops are the
// CSS snap's: each section's centre, the vita's top, the page's end. A
// trackpad's momentum after a glide is swallowed until it dies down, so one
// swipe is one section. Phones (touch) and reduced motion keep the native snap.
if (document.querySelector('body > section') &&
    matchMedia('(pointer: fine)').matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const GLIDE_MS = 900, QUIET_MS = 120, LONG = 1.25;   // LONG: a stretch this many windows tall reads freely
  document.documentElement.classList.add('glide');
  const maxY = () => document.documentElement.scrollHeight - window.innerHeight;
  const stops = () => {
    const ys = [...document.querySelectorAll('body > section')].map(sec => {
      const col = sec.querySelector('.col');
      if (sec.classList.contains('vita') && col) return col.getBoundingClientRect().top + window.scrollY;
      const r = sec.getBoundingClientRect();
      return r.top + window.scrollY + r.height / 2 - window.innerHeight / 2;
    });
    ys.push(maxY());
    return [...new Set(ys.map(y => Math.round(Math.min(Math.max(y, 0), maxY()))))].sort((a, b) => a - b)
      .filter((y, i, a) => i === 0 || y - a[i - 1] > 4);
  };
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let anim = null, lastWheel = 0;
  const glide = to => {
    const from = window.scrollY, d = to - from;
    if (Math.abs(d) < 2) return;
    const t0 = performance.now();
    const id = {};
    anim = id;
    const step = now => {
      if (anim !== id) return;
      const t = Math.min(1, (now - t0) / GLIDE_MS);
      window.scrollTo(0, from + d * ease(t));
      if (t < 1) requestAnimationFrame(step); else anim = null;
    };
    requestAnimationFrame(step);
  };
  // dir: 1 the next stop down, -1 the one up; 'first' / 'last'
  window.glideTo = dir => {
    const ys = stops(), y = window.scrollY;
    if (dir === 'first') return glide(ys[0]);
    if (dir === 'last') return glide(ys[ys.length - 1]);
    const next = dir > 0 ? ys.find(s => s > y + 4) : [...ys].reverse().find(s => s < y - 4);
    if (next !== undefined) glide(next);
  };
  // A stretch between two stops taller than the window (a short window's vita)
  // scrolls freely, so all of it can be read.
  const inLongStretch = dir => {
    const ys = stops(), y = window.scrollY;
    const below = ys.find(s => s > y + 4), above = [...ys].reverse().find(s => s < y - 4);
    const a = dir > 0 ? (ys.includes(Math.round(y)) ? Math.round(y) : above) : above;
    const b = dir > 0 ? below : (ys.includes(Math.round(y)) ? Math.round(y) : below);
    return a !== undefined && b !== undefined && b - a > window.innerHeight * LONG &&
      !(dir > 0 && Math.abs(y - b) < 4) && !(dir < 0 && Math.abs(y - a) < 4);
  };
  window.addEventListener('wheel', e => {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;   // pinch-zoom, sideways
    const dir = Math.sign(e.deltaY);
    if (!dir || inLongStretch(dir)) return;
    e.preventDefault();
    const now = performance.now(), quiet = now - lastWheel > QUIET_MS;
    lastWheel = now;
    if (!anim && quiet) window.glideTo(dir);
  }, { passive: false });
  window.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('button, input, textarea, select, [contenteditable]')) return;
    const k = e.key;
    const dir = k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey) ? 1
      : k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey) ? -1
      : k === 'Home' ? 'first' : k === 'End' ? 'last' : 0;
    if (!dir || (typeof dir === 'number' && inLongStretch(dir))) return;
    e.preventDefault();
    if (!e.repeat || !anim) window.glideTo(dir);
  });
  // A scroll the glide didn't make (the scrollbar, a touch screen) settles on
  // the nearest stop once it ends, as the snap did.
  let settle;
  const nearest = () => {
    if (anim || performance.now() - lastWheel < QUIET_MS * 2) return;
    const ys = stops(), y = window.scrollY;
    const i = ys.findIndex(s => s > y);
    if (i > 0 && ys[i] - ys[i - 1] > window.innerHeight * LONG) return;   // a long stretch reads freely
    const best = ys.reduce((a, s) => Math.abs(s - y) < Math.abs(a - y) ? s : a, ys[0]);
    glide(best);
  };
  window.addEventListener('scroll', () => { clearTimeout(settle); settle = setTimeout(nearest, 160); }, { passive: true });
}

// Mascot on a case study: unwind to the start angle, then go home. The plain
// href="/" is the no-JS fallback.
const toHome = document.querySelector('.home[href="/"]');
let leaving = false;
toHome?.addEventListener('click', event => {
  // A second click must still be swallowed, or the anchor navigates natively
  // and skips the unwind.
  if (leaving) { event.preventDefault(); return; }
  // Reduced motion: let the link navigate normally.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  event.preventDefault();
  leaving = true;

  // Derived from scroll, not from the transform matrix -- the matrix only
  // encodes rotation modulo 360, so it cannot tell two turns from none.
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? window.scrollY / max : 0;
  // At most one turn back. Capping the total instead would mean starting from a
  // value that is not visually the current angle, which snaps.
  const angle = (progress * 720) % 360;

  mark.classList.add('unwinding');   // hand the rotation over from the scroll timeline

  const duration = 250 + (angle / 360) * 300;
  mark.animate(
    [{ transform: `rotate(${angle}deg)` }, { transform: 'rotate(0deg)' }],
    { duration, easing: 'cubic-bezier(0.32, 0, 0.24, 1)', fill: 'forwards' }
  ).finished.then(() => { location.href = '/'; });
});
