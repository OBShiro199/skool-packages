# Pulls what the Vault page needs out of a Style Reference.
import re
def section(md, title):
    m = re.search(r'^## ' + re.escape(title) + r'.*?$(.*?)(?=^## |\Z)', md, re.M | re.S)
    return m.group(0).strip() if m else ''
def table(text):
    rows = [l for l in text.splitlines() if l.startswith('|')]
    if len(rows) < 3: return []
    head = [c.strip() for c in rows[0].strip('|').split('|')]
    return [dict(zip(head, [c.strip().strip('`') for c in r.strip('|').split('|')])) for r in rows[2:]]
def code(md, heading):
    m = re.search(r'### ' + re.escape(heading) + r'\s*```\w*\n(.*?)```', md, re.S)
    return m.group(1).strip() if m else ''
def parse(md):
    tagline = (re.search(r'^> (.+)$', md, re.M) or [None, ''])[1].strip()
    theme = 'dark' if re.search(r'\*\*Theme:\*\*\s*dark', md, re.I) else 'light'
    palette = [{'name': r.get('Name', ''), 'hex': r.get('Value', '').lower(), 'var': r.get('Token', ''), 'role': r.get('Role', '')} for r in table(section(md, 'Tokens — Colors'))]
    palette = [p for p in palette if re.fullmatch(r'#[0-9a-f]{6}([0-9a-f]{2})?', p['hex'])]
    compact = '\n\n'.join(x for x in [md.split('\n## ')[0].strip(), section(md, 'Tokens — Colors'), section(md, 'Tokens — Typography'), section(md, "Do's and Don'ts"), section(md, 'Agent Prompt Guide')] if x)
    return {'vibe': tagline.split('. ')[0].rstrip('.'), 'theme': theme, 'palette': palette, 'compact_md': compact, 'extended_md': md,
            'css': code(md, 'CSS Custom Properties'), 'tailwind': code(md, 'Tailwind v4'), 'words': len(md.split())}
