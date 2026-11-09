import json, concurrent.futures as cf
from run2 import do
def go(s):
    try: return s['name'], do(s)
    except Exception as e: return s['name'], 'FAILED ' + str(e)[:200]
sites, seen = [], set()
for s in json.load(open('sites.json')):
    if s.get('site') and s['name'] not in seen: seen.add(s['name']); sites.append(s)
for rnd in range(2):
    with cf.ThreadPoolExecutor(3) as ex:
        for name, r in ex.map(go, sites):
            if r != 'skip': print(name, r, flush=True)
print('ALL DONE', flush=True)
