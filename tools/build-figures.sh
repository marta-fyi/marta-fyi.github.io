#!/bin/sh
# Render tools/figures/*.html to assets/<name>.png.
#
# HTML and CSS rather than hand-written SVG: these are drawings of Miro
# boards, and flex and grid describe a board far more directly than absolute
# coordinates do. Chrome loads Archivo over HTTP and bakes it into the pixels,
# so the type in a figure matches the type around it.
#
# Each figure declares its own width in a <meta name="fig-width">, because the
# set has two: 540 for the right-hand column of a .pair, 1136 for a figure
# placed straight in the body. Both are measured against the page. Rendered at
# 2x and trimmed to content -- the window has to be tall enough for the
# longest figure, and the rest is whitespace nobody should scroll past.
#
# Needs the local server running, served over HTTP rather than file:// so the
# webfont and /tools paths resolve:
#     python3 -m http.server 8000 --bind 127.0.0.1
#
# The trim step is pinned to /usr/bin/python3: that is the interpreter with
# Pillow on it. Homebrew's python3 has none, so a bare python3 here fails.
#
# Run from the repo root.  ./tools/build-figures.sh [name ...]
set -e

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE="http://127.0.0.1:8000"
SCALE=2
H=4200

[ -x "$CHROME" ] || { echo "Chrome not found at $CHROME" >&2; exit 1; }
curl -sf -o /dev/null "$BASE/tools/figures/figure.css" || {
  echo "Server not serving $BASE" >&2; exit 1; }

if [ $# -eq 0 ]; then
  set -- $(cd tools/figures && ls *.html | sed 's/\.html$//')
fi

for name in "$@"; do
  src="tools/figures/$name.html"
  W=$(sed -n 's/.*name="fig-width" content="\([0-9]*\)".*/\1/p' "$src")
  [ -n "$W" ] || { echo "$src has no fig-width meta" >&2; exit 1; }

  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --force-device-scale-factor="$SCALE" --window-size="$W,$H" \
    --screenshot="assets/$name.png" \
    "$BASE/tools/figures/$name.html" 2>/dev/null

  /usr/bin/python3 - "assets/$name.png" "$SCALE" <<'PY'
import sys
from PIL import Image

path, scale = sys.argv[1], int(sys.argv[2])
im = Image.open(path).convert("RGB")
w, h = im.size
white = (255, 255, 255)

# Last row carrying ink, sampled every 3px across -- a hairline is
# 1px * scale, so it cannot fall between samples.
last = 0
for y in range(h - 1, -1, -1):
    if any(im.getpixel((x, y)) != white for x in range(0, w, 3)):
        last = y
        break

# Give back the sheet's own bottom padding, so the drawing is not cropped
# tight against its last line.
pad = 24 * scale
im.crop((0, 0, w, min(h, last + 1 + pad))).save(path, optimize=True)
print("wrote %s  %dx%d" % (path, w, min(h, last + 1 + pad)))
PY
done
