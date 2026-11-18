#!/bin/sh
# Stamp our own CSS/JS links with a hash of each file's content:
#   /work/production-hub/page.js  ->  /work/production-hub/page.js?v=1a2b3c4d
# GitHub Pages lets browsers cache files for 10 minutes, and an unchanged URL
# keeps serving the old file until then. A changed file gets a new URL, so a
# push shows up at once; an unchanged one keeps its stamp and stays cached.
#
# Run from anywhere before committing a change to any .css/.js:
#   sh tools/stamp-assets.sh
# Only root-relative .css/.js in href/src are touched (not fonts, not images).
set -e
cd "$(dirname "$0")/.."
for html in index.html cv.html 404.html work/*/index.html; do
  [ -f "$html" ] || continue
  perl -i -pe '
    s{\b(href|src)="(/[^"?]+\.(?:css|js))(?:\?v=[0-9a-f]*)?"}{
      my ($attr, $path) = ($1, $2);
      my $file = ".$path";
      if (-f $file) {
        my $h = `shasum "$file"`; $h = substr($h, 0, 8);
        "$attr=\"$path?v=$h\"";
      } else { "$attr=\"$path\"" }
    }ge;
  ' "$html"
done
grep -ho '\(href\|src\)="/[^"]*\.\(css\|js\)[^"]*"' index.html cv.html 404.html work/*/index.html | sort | uniq -c
