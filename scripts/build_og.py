"""Build link preview (og:image) images and tags for the whole site.

Runs automatically on every push (see .github/workflows/og-previews.yml).

Case studies: any page linked from a project card on the homepage gets a
1200x627 preview cropped from that card's image. The ?v= value in the tag is a
hash of the card image, so changing the card refreshes the preview everywhere.

Everything else: any page without an og:image gets the favicon preview.
Pages that already have an og:image (and aren't case studies) are left alone.
"""

import hashlib
import html
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.victorosondu.com"
OG_DIR = ROOT / "images" / "og"
W, H = 1200, 627
PANEL = "#121211"  # card background on the site, used behind transparent images
SKIP = re.compile(r"^(pinterest-|google)[\w-]*\.html$")

CARD_RE = re.compile(
    r'<a class="project-card" href="/([\w/-]+)">.*?<img src="([^"]+)"', re.S
)
OG_BLOCK = re.compile(
    r'[ \t]*<meta property="og:image"[^>]*>\n'
    r'(?:[ \t]*<meta property="og:image:(?:type|width|height)"[^>]*>\n)*'
)
TWITTER = re.compile(r'<meta name="twitter:card" content="[^"]*" />')


def indent_of(text):
    m = re.search(r"\n([ \t]*)<meta", text)
    return m.group(1) if m else "\t"


def set_tags(text, url, mime, width, height, card):
    ind = indent_of(text)
    block = (
        f'{ind}<meta property="og:image" content="{url}" />\n'
        f'{ind}<meta property="og:image:type" content="{mime}" />\n'
        f'{ind}<meta property="og:image:width" content="{width}" />\n'
        f'{ind}<meta property="og:image:height" content="{height}" />\n'
    )
    if OG_BLOCK.search(text):
        text = OG_BLOCK.sub(lambda _: block, text, count=1)
    else:
        # insert before the first favicon link, or before </head>
        anchor = text.find('<link rel="icon"')
        if anchor == -1:
            anchor = text.find("</head>")
        anchor = text.rfind("\n", 0, anchor) + 1
        text = text[:anchor] + block + text[anchor:]
    twitter = f'<meta name="twitter:card" content="{card}" />'
    if TWITTER.search(text):
        text = TWITTER.sub(twitter, text, count=1)
    else:
        i = text.index(block) + len(block)
        text = text[:i] + f"{ind}{twitter}\n" + text[i:]
    return text


def build_case_image(src, dest):
    im = Image.open(src)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, PANEL)
        bg.paste(im, mask=im.getchannel("A"))
        im = bg
    im = ImageOps.fit(im.convert("RGB"), (W, H), Image.LANCZOS, centering=(0.5, 0.5))
    # stay under ~300KB so WhatsApp still shows the preview
    for q in (85, 78, 70, 62, 55):
        im.save(dest, quality=q, optimize=True, progressive=True)
        if dest.stat().st_size < 290_000:
            break


def build_default_image(dest):
    fav = Image.open(ROOT / "images/Favicons/512x512/favicon-light.png").convert("RGBA")
    fav = fav.resize((1200, 1200), Image.LANCZOS)
    bg = Image.new("RGB", (1200, 1200), "#131313")
    bg.paste(fav, mask=fav.getchannel("A"))
    bg.save(dest, optimize=True)


def main():
    OG_DIR.mkdir(parents=True, exist_ok=True)
    changed = []

    default = OG_DIR / "default.png"
    if not default.exists():
        build_default_image(default)
        changed.append(default)

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    case_pages = {}
    for slug, src in CARD_RE.findall(index):
        src_path = ROOT / html.unescape(src).lstrip("./")
        page = ROOT / f"{slug}.html"
        if not src_path.exists() or not page.exists():
            print(f"skip {slug}: missing {'card image' if not src_path.exists() else 'page'}")
            continue
        case_pages[page] = (slug, src_path)

    for page, (slug, src_path) in case_pages.items():
        name = slug.replace("/", "-")
        version = hashlib.sha1(src_path.read_bytes()).hexdigest()[:8]
        dest = OG_DIR / f"{name}.jpg"
        url = f"{SITE}/images/og/{name}.jpg?v={version}"
        text = page.read_text(encoding="utf-8")
        if url not in text or not dest.exists():
            build_case_image(src_path, dest)
            changed.append(dest)
        new = set_tags(text, url, "image/jpeg", W, H, "summary_large_image")
        if new != text:
            page.write_text(new, encoding="utf-8")
            changed.append(page)

    for page in sorted(ROOT.rglob("*.html")):
        if page in case_pages or SKIP.match(page.name) or ".git" in page.parts:
            continue
        text = page.read_text(encoding="utf-8")
        if 'property="og:image"' in text:
            continue
        new = set_tags(text, f"{SITE}/images/og/default.png", "image/png", 1200, 1200, "summary")
        page.write_text(new, encoding="utf-8")
        changed.append(page)

    for p in changed:
        print("updated", p.relative_to(ROOT))
    if not changed:
        print("previews already up to date")


if __name__ == "__main__":
    sys.exit(main())
