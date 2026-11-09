# Writes our own Style Reference for one site, from what was measured on its live page.
import os, json, base64, re, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
KEYS = dict(l.split('=', 1) for l in open(os.environ.get('DESIGN_KEYS', os.path.join(HERE, '.keys'))).read().split())
PROMPT = open(os.path.join(HERE, 'master-prompt.md')).read()
WRITER = os.environ.get('DESIGN_MODEL', 'claude-opus-5-5')
TAGGER = 'claude-haiku-5-5'

def claude(model, system, content, max_tokens):
    body = json.dumps({'model': model, 'max_tokens': max_tokens, 'system': system, 'messages': [{'role': 'user', 'content': content}]}).encode()
    req = urllib.request.Request('https://api.anthropic.com/v1/messages', body, {'x-api-key': KEYS['ANTHROPIC_API_KEY'], 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
    err = None
    for k in range(5):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=900))
            return ''.join(b.get('text', '') for b in r['content']), r.get('stop_reason')
        except Exception as e:
            err = e; time.sleep(15 * (k + 1))
    raise RuntimeError(f'claude failed: {err}')

def write(name, url, measured, branding, views):
    system = PROMPT.replace('{Brand}', name).replace('{URL}', url)
    content = [{'type': 'text', 'text': f'Brand: {name}\nURL: {url}\n\n(a) Computed styles extracted from the live home page (counts in brackets are number of elements):\n{measured}\n\nFirecrawl brand summary of the same page:\n{json.dumps(branding)[:5000]}\n\n(b) Screenshots of the home page follow, top to bottom.'}]
    for v in views:
        content.append({'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': base64.b64encode(v).decode()}})
    content.append({'type': 'text', 'text': f'Write the {name} Style Reference now, in the exact format.'})
    md, stop = claude(WRITER, system, content, 32000)
    md = md.strip()
    if md.startswith('```'): md = re.sub(r'^```\w*\n|\n```$', '', md)
    if stop == 'max_tokens': raise RuntimeError('document cut off')
    return md

def tag(name, md):
    t, _ = claude(TAGGER, 'Return only JSON.', [{'type': 'text', 'text': f'From this style reference for {name}, return {{"category": one of ["AI","Developer tools","SaaS","Fintech","Health","Consumer","Agency","Commerce","Productivity","Analytics"], "tags": [3 short Title Case style tags, e.g. "Warm Paper","Pill Buttons","Dark UI","Serif Display","Mono Accents"]}}\n\n{md[:6000]}'}], 300)
    try:
        return json.loads(t[t.find('{'): t.rfind('}') + 1])
    except Exception:
        return {'category': 'SaaS', 'tags': []}
