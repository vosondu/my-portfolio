"""Compare generated pages in dist/ with the original hand-written pages."""
import re, sys, urllib.parse, difflib
from bs4 import BeautifulSoup, NavigableString, Comment

def norm_url(v):
    v = urllib.parse.unquote(v)
    v = re.sub(r'^\./', '/', v)
    if v.startswith('images/'): v = '/' + v
    return v

def flat(el, out, depth=0):
    for c in el.children:
        if isinstance(c, Comment): continue
        if isinstance(c, NavigableString):
            t = re.sub(r'\s+', ' ', str(c)).strip()
            if t: out.append('  '*depth + 'TEXT ' + t)
            continue
        attrs = []
        for k, v in sorted(c.attrs.items()):
            if isinstance(v, list): v = ' '.join(sorted(v))
            if k in ('src', 'poster', 'href'): v = norm_url(v)
            if k == 'style': v = re.sub(r'\s+', '', v).rstrip(';')
            attrs.append(f'{k}={v}')
        out.append('  '*depth + f'<{c.name} ' + ' '.join(attrs))
        flat(c, out, depth+1)

def page(path, part):
    s = BeautifulSoup(open(path).read(), 'html.parser')
    out = []
    if part == 'head':
        for m in s.head.find_all(['meta', 'link', 'title']):
            out.append(str(m))
        return out
    flat(s.find(part), out)
    return out

ok = True
for rel in sys.argv[1:]:
    for part in ('head', 'main'):
        a, b = page(rel, part), page('dist/' + rel, part)
        if a != b:
            ok = False
            print(f'== {rel} [{part}]')
            for l in difflib.unified_diff(a, b, 'original', 'generated', n=0, lineterm=''):
                print(l[:230])
print('ALL MATCH' if ok else 'DIFFERENCES ABOVE')
