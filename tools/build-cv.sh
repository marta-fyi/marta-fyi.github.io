#!/bin/sh
# Regenerate assets/marta-domingo-cv.pdf from cv.html.
#
# Renders through headless Chrome so the PDF uses the same Archivo and type
# scale as the site, with the webfont subset embedded in the file.
#
# Needs the local server running, served over HTTP rather than file:// so the
# webfont and /assets paths resolve:
#     python3 -m http.server 8000 --bind 127.0.0.1
#
# Run from the repo root.
set -e

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL="http://127.0.0.1:8000/cv.html"
OUT="assets/marta-domingo-cv.pdf"

[ -x "$CHROME" ] || { echo "Chrome not found at $CHROME" >&2; exit 1; }
curl -sf -o /dev/null "$URL" || { echo "Server not serving $URL" >&2; exit 1; }

# --no-pdf-header-footer drops Chrome's default date/URL furniture.
# Older Chrome spells this --print-to-pdf-no-header.
"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$OUT" "$URL" 2>/dev/null

echo "wrote $OUT"
