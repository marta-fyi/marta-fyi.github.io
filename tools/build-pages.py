#!/usr/bin/env python3
"""Generate the case study pages from work.json.

Each page is tools/templates/shell.html filled with one entry from work.json,
wrapping the hand-written body at tools/content/<slug>.html. Content fragments
are never written to -- only the shell around them.

Styles arrive in three widening-to-narrowing layers: style.css for the site,
tools/styles/<company>.css for the visual style shared by one employer's case
studies, and tools/content/<slug>.css for whatever only one page needs. See
extras(). Scripts follow the per-page rule only.

Also rewrites the work list on the homepage, between the work:start and
work:end markers, so the list and the pages cannot drift apart.

Run from the repo root:  ./tools/build-pages.py
"""

import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORK = json.loads((ROOT / "work.json").read_text())
SHELL = (ROOT / "tools" / "templates" / "shell.html").read_text()

MARK_START = "<!-- work:start -->"
MARK_END = "<!-- work:end -->"


def indent(text, spaces):
    """Indent the fragment to sit inside the shell, leaving <pre> alone.

    Whitespace inside <pre> is content, so padding it would change what the
    page actually shows. The opening line is still indented: the pad lands
    before the tag, which is outside the preformatted run.
    """
    pad = " " * spaces
    out = []
    in_pre = False
    for line in text.strip("\n").split("\n"):
        out.append(line if in_pre or not line.strip() else pad + line)
        opens, closes = line.count("<pre"), line.count("</pre>")
        if opens > closes:
            in_pre = True
        elif closes > opens:
            in_pre = False
    return "\n".join(out)


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def extras(item):
    """Stylesheets and scripts for one page, in cascade order.

    Three levels, each optional and each narrower than the last:

      style.css                     the site, linked by the shell
      tools/styles/<company>.css    the visual style for that employer's
                                    case-study content, shared by all of them
      tools/content/<slug>.css      whatever only this one page needs

    The employer sheet is what keeps two Miro case studies looking like each
    other, and keeps Miro's visuals from leaking into HP's. Authored under
    tools/, copied into the served tree so work/ stays the only thing shipped.
    """
    slug = item["slug"]
    tags = []

    house = ROOT / "tools" / "styles" / f"{slugify(item['company'])}.css"
    if house.exists():
        write(ROOT / "work" / "_shared" / house.name, house.read_text())
        tags.append('<link rel="stylesheet" href="/work/_shared/%s">' % house.name)

    for suffix, tag in (
        ("css", '<link rel="stylesheet" href="/work/%s/page.css">'),
        ("js", '<script src="/work/%s/page.js" defer></script>'),
    ):
        source = ROOT / "tools" / "content" / f"{slug}.{suffix}"
        if not source.exists():
            continue
        write(ROOT / "work" / slug / f"page.{suffix}", source.read_text())
        tags.append(tag % slug)
    return "".join(t + "\n" for t in tags)


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
        ("{{live}}", live),
        ("{{extras}}", extras(item)),
        ("{{pager}}", "\n".join(links)),
        ("{{body}}", indent(body_path.read_text(), 6)),
    ):
        out = out.replace(key, value)
    return out


def join_names(names):
    if len(names) == 1:
        return names[0]
    return ", ".join(names[:-1]) + " and " + names[-1]


def prose(items):
    """One sentence per company, in list order, linking every title.

    Consecutive entries at the same company are grouped so the sentence reads
    "A and B at Miro, 2025." rather than repeating the company each time. The
    year comes from the group's first entry.
    """
    groups = []
    for item in items:
        link = '<a href="/work/%s/">%s</a>' % (item["slug"], html.escape(item["title"]))
        if groups and groups[-1]["company"] == item["company"]:
            groups[-1]["names"].append(link)
        else:
            groups.append({"company": item["company"], "year": item["year"], "names": [link]})

    sentences = []
    for i, g in enumerate(groups):
        lead = "And " if i and i == len(groups) - 1 else ""
        sentences.append("%s%s at %s, %s." % (
            lead, join_names(g["names"]), html.escape(g["company"]), html.escape(g["year"])))
    return " ".join(sentences)


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

    listing = "      " + prose(WORK)

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
