# One site: Firecrawl renders the live page, returns branding data, computed CSS (measure.js) and a full-page screenshot.
import os, json, sys, time, urllib.request, io
from PIL import Image
KEYS = dict(l.split('=', 1) for l in open(os.environ.get('DESIGN_KEYS', '.keys')).read().split())
JS = open('measure.js').read()
def fc(url):
    body = json.dumps({'url': url, 'onlyMainContent': False, 'waitFor': 2500, 'timeout': 90000,
                       'formats': ['branding', {'type': 'screenshot', 'fullPage': True}],
                       'actions': [{'type': 'wait', 'milliseconds': 1500}, {'type': 'executeJavascript', 'script': JS}]}).encode()
    req = urllib.request.Request('https://api.firecrawl.dev/v2/scrape', body, {'Authorization': 'Bearer ' + KEYS['FIRECRAWL_API_KEY'], 'Content-Type': 'application/json'})
    while True:
        try:
            return json.load(urllib.request.urlopen(req, timeout=200))['data']
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(20); continue
            raise RuntimeError(f'firecrawl {e.code} {e.read()[:300]}')
def shots(png, slug, out):
    im = Image.open(io.BytesIO(png)).convert('RGB')
    w, h = im.size
    # scrolling preview: 720 wide, at most 7,200 tall
    p = im.resize((720, round(h * 720 / w)), Image.LANCZOS)
    p = p.crop((0, 0, 720, min(p.height, 7200)))
    p.save(f'{out}/{slug}.webp', 'WEBP', quality=72, method=6)
    # first screen, for the card poster and for Claude to look at
    p.crop((0, 0, 720, min(p.height, 450))).save(f'{out}/{slug}-poster.webp', 'WEBP', quality=78, method=6)
    views = []
    for y in (0, 1080, 2400):
        if y < h:
            b = io.BytesIO(); im.crop((0, y, w, min(h, y + 1200))).resize((1280, round(min(1200, h - y) * 1280 / w))).save(b, 'JPEG', quality=75); views.append(b.getvalue())
    return views, p.height
