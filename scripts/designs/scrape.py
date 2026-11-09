# One site: Firecrawl renders the live page, scrolls it like a visitor so lazy and scroll-triggered sections
# load, then returns branding data, computed CSS (measure.js) and a full-page screenshot.
import os, json, sys, time, urllib.request, io
from PIL import Image, ImageStat
HERE = os.path.dirname(os.path.abspath(__file__))
KEYS = dict(l.split('=', 1) for l in open(os.environ.get('DESIGN_KEYS', os.path.join(HERE, '.keys'))).read().split())
JS = open(os.path.join(HERE, 'measure.js')).read()
REVEAL = """
(() => {
  // Show anything still waiting for a scroll trigger: hidden fade-ins, reveal transforms, lazy images.
  document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager' })
  document.querySelectorAll('img[data-src]').forEach((i) => { if (!i.src || i.src.startsWith('data:')) i.src = i.dataset.src })
  const st = document.createElement('style')
  st.textContent = '*,*::before,*::after{animation-play-state:paused!important;animation-delay:-60s!important;transition:none!important}'
  document.head.appendChild(st)
  // Remove cookie/consent banners, chat widgets and any fixed overlay that dims or covers the page.
  const vw = innerWidth, vh = innerHeight
  document.querySelectorAll('body *').forEach((el) => {
    const s = getComputedStyle(el)
    const id = ((el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '')).toLowerCase()
    if (/cookie|consent|gdpr|privacy-banner|cc-window|truste|onetrust|cookiebot|osano|termly|cky-|cmp|intercom|crisp|drift|hubspot-messages|chat-widget/.test(id)) { el.remove(); return }
    if (s.position === 'fixed' || s.position === 'sticky') {
      const r = el.getBoundingClientRect()
      const covers = r.width * r.height > vw * vh * 0.3
      const tag = el.tagName.toLowerCase()
      if (covers && tag !== 'header' && tag !== 'nav' && !el.querySelector('nav')) el.remove()
    }
  })
  document.querySelectorAll('dialog, [role="dialog"], [aria-modal="true"]').forEach((el) => el.remove())
  // small floating boxes that talk about cookies (banners without a telltale class name)
  document.querySelectorAll('body *').forEach((el) => {
    const s = getComputedStyle(el)
    if ((s.position === 'fixed' || s.position === 'absolute') && /cookie|privacy policy/i.test(el.innerText || '') && el.getBoundingClientRect().height < vh * 0.5 && (el.innerText || '').length < 600) el.remove()
  })
  document.documentElement.style.overflow = 'visible'; document.body.style.overflow = 'visible'
  let n = 0
  if (!window.__FORCE_REVEAL) { window.scrollTo(0, 0); return 0 }
  document.querySelectorAll('body *').forEach((el) => {
    const s = getComputedStyle(el)
    if (s.position === 'fixed' || el.closest('header, nav, [role="menu"], [role="listbox"], [class*="dropdown" i], [class*="menu" i], [class*="popover" i], [class*="tooltip" i]')) return
    if ((+s.opacity < 0.05 || s.visibility === 'hidden') && el.getBoundingClientRect().height > 8 && !el.closest('[aria-hidden="true"]')) {
      el.style.setProperty('opacity', '1', 'important'); el.style.setProperty('visibility', 'visible', 'important'); el.style.setProperty('transform', 'none', 'important'); n++
    }
  })
  window.scrollTo(0, 0)
  return n
})()
"""
def actions():
    a = [{'type': 'wait', 'milliseconds': 1500}]
    for _ in range(int(os.environ.get('SCROLLS', '14'))):
        a += [{'type': 'scroll', 'direction': 'down'}, {'type': 'wait', 'milliseconds': 450}]
    force = 'true' if os.environ.get('FORCE_REVEAL', '1') == '1' else 'false'
    a += [{'type': 'executeJavascript', 'script': f'window.__FORCE_REVEAL = {force};' + REVEAL}, {'type': 'wait', 'milliseconds': 1500}, {'type': 'executeJavascript', 'script': JS}]
    return a
def fc(url, measure=True):
    body = json.dumps({'url': url, 'onlyMainContent': False, 'waitFor': 2500, 'timeout': int(os.environ.get('FC_TIMEOUT', '150000')),
                       'formats': (['branding'] if measure else []) + [{'type': 'screenshot', 'fullPage': True}],
                       'actions': actions()}).encode()
    req = urllib.request.Request('https://api.firecrawl.dev/v2/scrape', body, {'Authorization': 'Bearer ' + KEYS['FIRECRAWL_API_KEY'], 'Content-Type': 'application/json'})
    for k in range(6):
        try:
            return json.load(urllib.request.urlopen(req, timeout=240))['data']
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(20); continue
            if e.code >= 500 and k < 2: time.sleep(10); continue
            raise RuntimeError(f'firecrawl {e.code} {e.read()[:300]}')
    raise RuntimeError('firecrawl rate limited')
def measured_of(page):
    rets = (page.get('actions') or {}).get('javascriptReturns') or []
    for r in reversed(rets):
        v = r.get('value') if isinstance(r, dict) else r
        if isinstance(v, str) and v.startswith('{'): return v
    return '{}'
def blank_rows(im):
    # a row is blank when it is (nearly) one flat colour
    g = im.convert('L').resize((180, im.height))
    out = []
    for y in range(g.height):
        row = g.crop((0, y, 180, y + 1))
        out.append(ImageStat.Stat(row).stddev[0] < 2.2)
    return out
def emptiness(im):
    b = blank_rows(im)
    run = best = 0
    for v in b:
        run = run + 1 if v else 0; best = max(best, run)
    return sum(b) / max(1, len(b)), best
def shots(png, slug, out):
    im = Image.open(io.BytesIO(png)).convert('RGB')
    w, h = im.size
    p = im.resize((720, round(h * 720 / w)), Image.LANCZOS)
    b = blank_rows(p)
    end = len(b)
    while end > 450 and b[end - 1]: end -= 1          # trim the flat tail
    p = p.crop((0, 0, 720, min(end + 24, p.height)))
    # collapse any flat band taller than 260px down to 160px, so a preview never scrolls through emptiness
    b = blank_rows(p); keep = []; y = 0
    while y < len(b):
        if b[y]:
            z = y
            while z < len(b) and b[z]: z += 1
            keep.append((y, min(z, y + 160) if z - y > 260 else z)); y = z
        else:
            z = y
            while z < len(b) and not b[z]: z += 1
            keep.append((y, z)); y = z
    out_h = sum(z - y for y, z in keep)
    q = Image.new('RGB', (720, out_h)); oy = 0
    for y, z in keep:
        q.paste(p.crop((0, y, 720, z)), (0, oy)); oy += z - y
    p = q.crop((0, 0, 720, min(q.height, 7200)))
    p.save(f'{out}/{slug}.webp', 'WEBP', quality=72, method=6)
    p.crop((0, 0, 720, min(p.height, 450))).save(f'{out}/{slug}-poster.webp', 'WEBP', quality=78, method=6)
    views = []
    for y in (0, 1080, 2400):
        if y < h:
            bb = io.BytesIO(); im.crop((0, y, w, min(h, y + 1200))).resize((1280, round(min(1200, h - y) * 1280 / w))).save(bb, 'JPEG', quality=75); views.append(bb.getvalue())
    frac, longest = emptiness(p)
    return views, p.height, frac, longest
