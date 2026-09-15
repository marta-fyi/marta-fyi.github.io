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
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
});

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
