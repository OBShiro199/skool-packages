"""Copies generated designs (scratch out/ folder) into public/designs: index.json, <slug>.json and the screenshots.

    python3 scripts/designs/export.py <generated-folder>
"""
import json, os, shutil, sys, datetime
src = sys.argv[1]
dst = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'designs')
os.makedirs(dst, exist_ok=True)
order = [s['name'] for s in json.load(open(os.path.join(src, '..', 'sites.json'))) if s.get('name')]
prev = {}
if os.path.exists(os.path.join(dst, 'index.json')):
    prev = {d['slug']: d.get('added') for d in json.load(open(os.path.join(dst, 'index.json')))}
today = datetime.date.today().isoformat()
EXCLUDE = {'hellotime', 'opennote'}  # sites that have shut down
keys = ['slug', 'name', 'url', 'refero_url', 'vibe', 'tags', 'category', 'theme', 'logo', 'preview_h', 'palette', 'added']
index = []
for f in sorted(os.listdir(src)):
    if not f.endswith('.json') or f.endswith('.raw.json'): continue
    d = json.load(open(os.path.join(src, f)))
    if d.get('slug') in EXCLUDE: continue
    if f.endswith('.raw.json') or not d.get('extended_md') or not os.path.exists(os.path.join(src, d['slug'] + '.webp')): continue
    d = {k: d[k] for k in keys + ['compact_md', 'extended_md', 'css', 'tailwind'] if k in d}
    d['added'] = prev.get(d['slug']) or today
    d['vibe'] = d['vibe'][:1].upper() + d['vibe'][1:]
    json.dump(d, open(os.path.join(dst, d['slug'] + '.json'), 'w'), separators=(',', ':'))
    for ext in ('.webp', '-poster.webp'):
        shutil.copyfile(os.path.join(src, d['slug'] + ext), os.path.join(dst, d['slug'] + ext))
    index.append({k: d.get(k) for k in keys} | {'palette': d['palette'][:5]})
pos = {n: i for i, n in enumerate(order)}
index.sort(key=lambda d: pos.get(d['name'], -1))
json.dump(index, open(os.path.join(dst, 'index.json'), 'w'), separators=(',', ':'))
print(len(index), 'designs exported')
