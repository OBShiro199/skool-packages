# Re-takes the screenshot for finished designs (keeps their document), using the scroll-and-reveal capture.
import json, os, sys, urllib.request
from scrape import fc, shots, emptiness
from PIL import Image
OUT = 'out2'
def redo(slug, url):
    page = fc(url, measure=False)
    png = urllib.request.urlopen(page['screenshot'], timeout=120).read()
    _, ph, frac, longest = shots(png, slug, OUT)
    for f in (f'{OUT}/{slug}.json', f'{OUT}/{slug}.raw.json'):
        if os.path.exists(f):
            d = json.load(open(f)); d['preview_h'] = ph; d['blank'] = frac; d['blank_run'] = longest; json.dump(d, open(f, 'w'), indent=1)
    return ph, round(frac, 2), longest
if __name__ == '__main__':
    sites = {s['name']: s for s in json.load(open('sites.json')) if s.get('site')}
    import re
    for name in sys.argv[1:]:
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        try: print(name, redo(slug, sites[name]['site']), flush=True)
        except Exception as e: print(name, 'FAILED', str(e)[:200], flush=True)
