#!/usr/bin/env python3
"""Generate the case study pages from work.json.

Each page is tools/templates/shell.html filled with one entry from work.json,
wrapping the hand-written body at tools/content/<slug>.html. Content fragments
are never written to -- only the shell around them.

Also rewrites the work list on the homepage, between the work:start and
work:end markers, so the list and the pages cannot drift apart.

Run from the repo root:  ./tools/build-pages.py
"""

import html
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORK = json.loads((ROOT / "work.json").read_text())
SHELL = (ROOT / "tools" / "templates" / "shell.html").read_text()

MARK_START = "<!-- work:start -->"
MARK_END = "<!-- work:end -->"


def indent(text, spaces):
    pad = " " * spaces
    return "\n".join(pad + line if line.strip() else line
                     for line in text.strip("\n").split("\n"))


def page(item, prev_item, next_item):
    slug = item["slug"]
    title = item["title"]
    body_path = ROOT / "tools" / "content" / f"{slug}.html"
    if not body_path.exists():
        sys.exit(f"missing content fragment: {body_path.relative_to(ROOT)}")

    meta = " · ".join(p for p in (item.get("role"), item.get("company"), item.get("year")) if p)
    description = f"{title} — {meta}. Case study by Marta Domingo."

    live = ""
    if item.get("live"):
        live = ('    <p class="live"><a href="%s" target="_blank" '
                'rel="noopener noreferrer">View live</a></p>' % html.escape(item["live"]))

    # No wrap-around: at either end the missing side is simply absent, so the
    # sequence has a real beginning and end.
    links = []
    if prev_item:
        links.append('    <a class="prev" href="/work/%s/"><span>Previous</span>'
                     '<span class="title">%s</span></a>'
                     % (prev_item["slug"], html.escape(prev_item["title"])))
    if next_item:
        links.append('    <a class="next" href="/work/%s/"><span>Next</span>'
                     '<span class="title">%s</span></a>'
                     % (next_item["slug"], html.escape(next_item["title"])))

    out = SHELL
    for key, value in (
        ("{{slug}}", slug),
        ("{{title}}", html.escape(title)),
        ("{{description}}", html.escape(description)),
        ("{{meta}}", html.escape(meta)),
        ("{{live}}", live),
        ("{{pager}}", "\n".join(links)),
        ("{{body}}", indent(body_path.read_text(), 6)),
    ):
        out = out.replace(key, value)
    return out


def write(path, text):
    """Write only when the content actually changes, so reruns are no-ops."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text() == text:
        print(f"  unchanged  {path.relative_to(ROOT)}")
        return
    path.write_text(text)
    print(f"  wrote      {path.relative_to(ROOT)}")


def main():
    print("case study pages:")
    for i, item in enumerate(WORK):
        write(
            ROOT / "work" / item["slug"] / "index.html",
            page(item, WORK[i - 1] if i > 0 else None,
                 WORK[i + 1] if i + 1 < len(WORK) else None),
        )

    listing = "\n".join(
        '        <li><a href="/work/%s/">%s</a>, at %s.</li>'
        % (item["slug"], html.escape(item["title"]), html.escape(item["company"]))
        for item in WORK
    )

    index_path = ROOT / "index.html"
    index = index_path.read_text()
    if MARK_START not in index or MARK_END not in index:
        sys.exit(f"markers {MARK_START} / {MARK_END} not found in index.html")
    head, rest = index.split(MARK_START, 1)
    _, tail = rest.split(MARK_END, 1)
    print("homepage list:")
    write(index_path, f"{head}{MARK_START}\n{listing}\n        {MARK_END}{tail}")


if __name__ == "__main__":
    main()
