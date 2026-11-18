"""One-time importer: turns the hand-written case study and article pages
into content files the editor and build script use. Kept for reference."""

import html
import re
import sys
import urllib.parse
from pathlib import Path

import yaml
from bs4 import BeautifulSoup, NavigableString
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content"
CASES = ["joie-luxe-rentals", "boa-zerah", "addide-rebrand", "komis-kitchen",
         "centratutor", "mahadumia", "bwbcon-2026"]


class Literal(str):
    pass


def literal_repr(dumper, data):
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")


yaml.add_representer(Literal, literal_repr)


def norm_path(src):
    p = urllib.parse.unquote(src)
    p = re.sub(r"^\./", "", p)
    return "/" + p.lstrip("/")


def file_ratio(path):
    try:
        w, h = Image.open(ROOT / path.lstrip("/")).size
        return w / h
    except Exception:
        return None


def get_ar(el):
    m = re.search(r"--ar:\s*([\d.]+)", el.get("style", ""))
    return float(m.group(1)) if m else None


def inner(el):
    return "".join(str(c) for c in el.contents).strip()


def media_item(el):
    item = {}
    if el.name == "img":
        item["image"] = norm_path(el["src"])
        item["alt"] = el.get("alt", "")
        ar = get_ar(el)
        fr = file_ratio(item["image"])
        if ar and fr and abs(ar - fr) > 0.002:
            item["shape"] = round(ar, 4)
    elif el.name == "video":
        src = el.find("source")["src"]
        item["video"] = norm_path(src)
        if el.get("poster"):
            item["image"] = norm_path(el["poster"])
        item["alt"] = el.get("aria-label", "")
        item["playback"] = "autoplay" if el.has_attr("autoplay") else "controls"
        # shape comes from the video file itself at build time
    elif "logo-cell" in el.get("class", []):
        img = el.find("img")
        item["image"] = norm_path(img["src"])
        item["alt"] = img.get("alt", "")
        item["background"] = "light" if "light" in el["class"] else "dark"
        ar = get_ar(el)
        if ar and abs(ar - 1.6) > 0.002:
            item["shape"] = round(ar, 4)
    return {k: v for k, v in item.items() if v not in ("", None)}


def media_items(container):
    row = container.find(class_=["cs-row", "cs-split"], recursive=False)
    holder = row if row else container
    out = []
    for el in holder.find_all(True, recursive=False):
        if el.name in ("img", "video") or "logo-cell" in el.get("class", []):
            out.append(media_item(el))
    layout = "split" if row and "cs-split" in row["class"] else None
    return out, layout


def import_case(slug):
    soup = BeautifulSoup((ROOT / f"{slug}.html").read_text(), "html.parser")
    head = soup.head
    title_tag = head.title.get_text()
    desc = head.find("meta", attrs={"name": "description"})["content"]
    main = soup.main
    intro = main.find(class_="page-intro")
    data = {
        "title": intro.h1.get_text(),
        "subtitle": intro.find("p").get_text(),
        "seo": {"title": title_tag.replace(" | Victor Osondu", ""), "description": desc},
    }
    hero = main.find(class_="cs-hero")
    items, _ = media_items(hero)
    data["hero"] = items
    meta = main.find(class_="cs-meta")
    data["details"] = [
        {"label": d.find_all("p")[0].get_text(), "value": d.find_all("p")[1].get_text()}
        for d in meta.find_all("div", recursive=False)
    ]
    sections = []
    for el in meta.find_next_siblings():
        cls = el.get("class", [])
        if "cs-text" in cls:
            body = inner(el.find(class_="prose"))
            body = re.sub(r'<p class="white">(.*?)</p>', r"<blockquote><p>\1</p></blockquote>", body, flags=re.S)
            body = re.sub(r"\n\s*", "\n", body)
            sections.append({"type": "text", "body": Literal(body + "\n")})
        elif "cs-media" in cls:
            sw = el.find(class_="swatches")
            if sw:
                cols = []
                for s in sw.find_all(class_="swatch"):
                    hexv = re.search(r"background:\s*(#[0-9a-fA-F]{6})", s["style"]).group(1)
                    label = s.get_text()
                    name = label.split("·")[0].strip()
                    cols.append({"name": name, "hex": hexv.upper()})
                sections.append({"type": "colours", "label": sw.get("aria-label", ""), "colours": cols})
                continue
            items, layout = media_items(el)
            block = {"type": "media", "items": items}
            if layout:
                block["layout"] = layout
            cap = el.find("p", class_="muted", recursive=False)
            if cap:
                block["caption"] = cap.get_text()
            if el.get("id"):
                block["anchor"] = el["id"]
            sections.append(block)
        elif "cs-quote" in cls:
            bq = el.blockquote
            sections.append({"type": "quote", "quote": bq.p.get_text(), "author": bq.footer.get_text()})
        elif el.name == "nav":
            break
        else:
            print("UNKNOWN", slug, el.name, cls, file=sys.stderr)
    data["sections"] = sections
    return data


def import_home():
    soup = BeautifulSoup((ROOT / "index.html").read_text(), "html.parser")
    grid = soup.find(class_="projects-grid")
    rows, cards = [], {}
    for el in grid.find_all(True, recursive=False):
        links = [el] if "project-card" in el.get("class", []) else el.find_all("a", class_="project-card")
        refs = []
        for a in links:
            slug = a["href"].strip("/")
            img = a.find("img")
            cards[slug] = {
                "image": norm_path(img["src"]),
                "alt": img.get("alt", ""),
                "tags": a.find(class_="tags").get_text(),
                "name": a.find(class_="name").get_text(),
            }
            refs.append(f"content/case-studies/{slug}.yml")
        if len(refs) == 1:
            rows.append({"type": "single", "project": refs[0]})
        else:
            rows.append({"type": "pair", "narrow": refs[0], "wide": refs[1]})
    return rows, cards


def import_article(path):
    soup = BeautifulSoup(path.read_text(), "html.parser")
    head = soup.head
    get = lambda **kw: head.find("meta", attrs=kw)["content"]
    main = soup.main
    intro = main.find(class_="page-intro")
    data = {
        "title": intro.h1.get_text(),
        "date": main.find("time")["datetime"],
        "updated": get(property="article:published_time"),
        "seo": {
            "title": get(property="og:title"),
            "description": get(name="description"),
        },
    }
    m = re.search(r'"dateModified":\s*"([^"]+)"', str(head))
    if m:
        data["updated"] = m.group(1)
    body = main.find(class_="article-body")
    blocks, buf = [], []

    def flush():
        if buf:
            h = "\n".join(buf)
            h = re.sub(r' class="(text-link|article-list)"', "", h)
            h = re.sub(r' target="_blank" rel="noopener"', "", h)
            h = re.sub(r"\n\s*", "\n", h)
            blocks.append({"type": "text", "body": Literal(h + "\n")})
            buf.clear()

    for el in body.find_all(True, recursive=False):
        cls = el.get("class", [])
        if "article-table" in cls:
            flush()
            t = el.table
            cols = [th.get_text() for th in t.thead.find_all("th")]
            rows = [{"cells": [inner(c) for c in tr.find_all(["th", "td"])]} for tr in t.tbody.find_all("tr")]
            blocks.append({"type": "table", "columns": cols, "rows": rows})
        elif el.name == "p" and "article-note" in cls:
            flush()
            h = re.sub(r' class="text-link"', "", inner(el))
            h = re.sub(r' target="_blank" rel="noopener"', "", h)
            blocks.append({"type": "note", "body": Literal("<p>" + h + "</p>\n")})
        else:
            buf.append(str(el))
    flush()
    data["body"] = blocks
    return data


def dump(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.dump(data, allow_unicode=True, sort_keys=False, width=1000))


def main():
    rows, cards = import_home()
    for slug in CASES:
        d = import_case(slug)
        card = cards.get(slug)
        d = {**{k: d[k] for k in ("title", "subtitle")},
             "card": {"image": card["image"], "alt": card["alt"], "tags": card["tags"]},
             **{k: v for k, v in d.items() if k not in ("title", "subtitle")}}
        if card["name"] != d["title"]:
            d["card"]["name"] = card["name"]
        dump(OUT / "case-studies" / f"{slug}.yml", d)
    dump(OUT / "home.yml", {"projects": rows})

    wsoup = BeautifulSoup((ROOT / "writing.html").read_text(), "html.parser")
    order = []
    for a in wsoup.select(".writing-link"):
        slug = a["href"].rsplit("/", 1)[-1]
        d = import_article(ROOT / "writing" / f"{slug}.html")
        d = {"title": d["title"], "summary": a.find(class_="writing-desc").get_text(), **{k: v for k, v in d.items() if k != "title"}}
        dump(OUT / "articles" / f"{slug}.yml", d)
        order.append(f"content/articles/{slug}.yml")
    dump(OUT / "writing.yml", {"articles": order})


if __name__ == "__main__":
    main()
