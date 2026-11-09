import json, os, re, sys, urllib.request
from scrape import fc, shots, measured_of
from gen2 import write, tag
from parse import parse
OUT = 'out2'; os.makedirs(OUT, exist_ok=True)
def slugify(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
def do(site):
    slug = slugify(site['name'])
    if os.path.exists(f'{OUT}/{slug}.json'): return 'skip'
    raw = f'{OUT}/{slug}.raw.json'
    if os.path.exists(raw):
        d = json.load(open(raw)); views = [open(f'{OUT}/{slug}.v{i}.jpg', 'rb').read() for i in range(d['nviews'])]
    else:
        page = fc(site['site'])
        png = urllib.request.urlopen(page['screenshot'], timeout=120).read()
        views, ph, frac, longest = shots(png, slug, OUT)
        branding = dict(page.get('branding') or {}); imgs = branding.pop('images', {}) or {}
        d = {'measured': measured_of(page), 'blank': frac, 'blank_run': longest, 'branding': branding, 'preview_h': ph, 'logo': imgs.get('favicon') or imgs.get('logo'), 'nviews': len(views)}
        for i, v in enumerate(views): open(f'{OUT}/{slug}.v{i}.jpg', 'wb').write(v)
        json.dump(d, open(raw, 'w'))
    mdf = f'{OUT}/{slug}.md'
    md = open(mdf).read() if os.path.exists(mdf) else write(site['name'], site['site'], d['measured'] or '{}', d['branding'], views)
    open(mdf, 'w').write(md)
    p = parse(md)
    meta = tag(site['name'], md)
    logo = d['logo'] if d['logo'] and not str(d['logo']).startswith('data:') else None
    rec = {'slug': slug, 'name': site['name'], 'url': site['site'], 'refero_url': site['refero_url'], 'preview_h': d['preview_h'], 'logo': logo, **meta, **p}
    json.dump(rec, open(f'{OUT}/{slug}.json', 'w'), indent=1)
    return f"ok {p['words']} words, {len(p['palette'])} colours"
if __name__ == '__main__':
    only = sys.argv[1:]
    for s in json.load(open('sites.json')):
        if not s.get('site') or (only and s['name'] not in only): continue
        try: print(s['name'], do(s), flush=True)
        except Exception as e: print(s['name'], 'FAILED', str(e)[:300], flush=True)
