(() => {
  const cs = (el) => getComputedStyle(el)
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = cs(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 }
  const hex = (c) => { const m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); if (!m) return null; const a = m[4] === undefined ? 1 : +m[4]; if (a < 0.02) return null; const h = [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join(''); return '#' + h + (a < 0.99 ? Math.round(a * 255).toString(16).padStart(2, '0') : '') }
  const fam = (s) => s.fontFamily.split(',')[0].replace(/["']/g, '').trim()
  const bump = (o, k, n = 1) => { if (k !== null && k !== undefined && k !== '') o[k] = (o[k] || 0) + n }
  const colors = { 'background-color': {}, color: {}, 'border-color': {} }
  const fonts = {}, typo = {}, radius = {}, shadows = {}, spacing = {}, maxw = {}, features = {}
  const kind = (el) => {
    const t = el.tagName.toLowerCase(), c = (el.className && el.className.baseVal === undefined ? el.className : '') + ' ' + (el.getAttribute('role') || '')
    if (t === 'button' || /\bbtn|button/i.test(c) || (t === 'a' && /button|btn|cta/i.test(c))) return 'buttons'
    if (t === 'input' || t === 'textarea' || t === 'select') return 'inputs'
    if (t === 'img' || t === 'video' || t === 'picture' || t === 'canvas') return 'images'
    if (t === 'nav' || t === 'header') return 'nav'
    if (/badge|tag|chip|pill|label/i.test(c)) return 'tags'
    if (/avatar/i.test(c)) return 'avatars'
    if (/card|tile|panel|box/i.test(c)) return 'cards'
    if (t === 'section') return 'sections'
    return 'other'
  }
  const els = [...document.querySelectorAll('body *')].filter(vis).slice(0, 6000)
  for (const el of els) {
    const s = cs(el), r = el.getBoundingClientRect()
    bump(colors['background-color'], hex(s.backgroundColor))
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (hasText) {
      bump(colors.color, hex(s.color))
      bump(fonts, `${fam(s)} | ${s.fontWeight}`)
      bump(typo, `${fam(s)} | ${s.fontWeight} | ${s.fontSize} | lh ${s.lineHeight} | ls ${s.letterSpacing} | ${s.textTransform}`)
      if (s.fontFeatureSettings && s.fontFeatureSettings !== 'normal') bump(features, `${fam(s)}: ${s.fontFeatureSettings}`)
    }
    if (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none') bump(colors['border-color'], `${hex(s.borderTopColor)} ${s.borderTopWidth}`)
    if (s.borderRadius !== '0px') bump(radius, `${kind(el)}: ${s.borderRadius}`)
    if (s.boxShadow !== 'none') bump(shadows, s.boxShadow)
    for (const p of ['paddingTop', 'paddingLeft', 'rowGap', 'columnGap', 'marginTop', 'marginBottom']) { const v = parseFloat(s[p]); if (v > 0 && v < 400) bump(spacing, Math.round(v) + 'px') }
    if (s.maxWidth !== 'none' && s.maxWidth.endsWith('px') && r.width > 300) bump(maxw, s.maxWidth)
  }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v})`)
  const sample = (sel, n) => [...document.querySelectorAll(sel)].filter(vis).slice(0, n).map((el) => { const s = cs(el), r = el.getBoundingClientRect(); return { tag: el.tagName.toLowerCase(), text: (el.innerText || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), font: `${fam(s)} ${s.fontWeight} ${s.fontSize}/${s.lineHeight} ls ${s.letterSpacing}`, color: hex(s.color), bg: hex(s.backgroundColor), border: s.borderTopWidth !== '0px' ? `${s.borderTopWidth} ${s.borderTopStyle} ${hex(s.borderTopColor)}` : 'none', radius: s.borderRadius, padding: s.padding, shadow: s.boxShadow === 'none' ? 'none' : s.boxShadow, backdrop: s.backdropFilter && s.backdropFilter !== 'none' ? s.backdropFilter : undefined } })
  const header = document.querySelector('header, nav')
  return JSON.stringify({
    title: document.title,
    page: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, sections: document.querySelectorAll('section').length, bodyBg: hex(cs(document.body).backgroundColor) || hex(cs(document.documentElement).backgroundColor), navSticky: header ? cs(header).position : null, navHeight: header ? Math.round(header.getBoundingClientRect().height) : null },
    colors: { 'background-color': top(colors['background-color'], 18), color: top(colors.color, 16), 'border-color': top(colors['border-color'], 10) },
    fontFamiliesWeights: top(fonts, 14),
    typeUsages: top(typo, 30),
    openType: top(features, 6),
    radiusByElement: top(radius, 22),
    shadows: top(shadows, 8),
    spacing: top(spacing, 26),
    maxWidths: top(maxw, 8),
    samples: { h1: sample('h1', 2), h2: sample('h2', 4), h3: sample('h3', 4), p: sample('p', 4), buttons: sample('button, a[class*="button" i], a[class*="btn" i], [role="button"]', 12), nav: sample('header a, nav a', 8), inputs: sample('input, textarea', 3), cards: sample('[class*="card" i], [class*="tile" i]', 6), badges: sample('[class*="badge" i], [class*="tag" i], [class*="chip" i], [class*="pill" i]', 6), images: sample('main img, section img', 5), footer: sample('footer', 1) },
  })
})()
