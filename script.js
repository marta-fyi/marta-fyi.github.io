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
copyBtn.addEventListener('click', async () => {
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
