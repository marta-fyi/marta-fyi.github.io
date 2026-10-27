#!/bin/sh
# Miro.Design: builds the Manifesto's v3 scroll story from its source and encrypts it into
# work/miro-design/payload.bin. Run it yourself in a terminal: it asks for
# the password (hidden, twice).
#
#   sh tools/build-miro-design.sh
#
# Source: a local clone of Miro's internal prototype repo (path below, or
# MIRO26_SRC), with marta.fyi's changes on top -- local only, never pushed.
# Built by ~/dev/_src/marta-build/build.ts. The plaintext build stays in
# ~/dev/_src/marta-build/out/ and never enters this repo.
set -e
SRC="${MIRO26_SRC:-$HOME/dev/_src/miro26-fall}"
OUT="$HOME/dev/_src/marta-build/out"
SITE="$(cd "$(dirname "$0")/.." && pwd)"

(cd "$SRC" && bun ../marta-build/build.ts)

CSS=""
[ -f "$OUT/manifesto.css" ] && CSS="--css $OUT/manifesto.css"
# shellcheck disable=SC2086
node "$SITE/tools/encrypt-page.mjs" "$SITE/work/miro-design/payload.bin" \
  --js "$OUT/manifesto.js" $CSS \
  --dir "/__mfy/assets/=$OUT/assets" \
  --file "/src/assets/portfolio/flexfund.html=$SRC/src/assets/portfolio/flexfund.html"
