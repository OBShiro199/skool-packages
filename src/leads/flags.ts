// Country name → flag (PRD 10.3), from the browser's own country names plus common aliases.
const RETIRED = new Set(['DD', 'YU', 'CS', 'SU', 'ZR', 'BU', 'TP', 'NT', 'AN', 'QO', 'EU', 'EZ', 'UN', 'XA', 'XB', 'ZZ', 'QU'])
const ALIASES: Record<string, string> = {
  uk: 'GB', 'great britain': 'GB', england: 'GB', scotland: 'GB', wales: 'GB', 'northern ireland': 'GB', usa: 'US',
  'czech republic': 'CZ', turkey: 'TR', russia: 'RU', 'south korea': 'KR', vietnam: 'VN', 'the netherlands': 'NL', holland: 'NL',
}
let map: Map<string, string> | null = null
function build() {
  map = new Map(Object.entries(ALIASES))
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'region' })
    for (let a = 65; a <= 90; a++)
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b)
        if (RETIRED.has(code)) continue
        const name = names.of(code)
        if (name && name !== code && !map.has(name.toLowerCase())) map.set(name.toLowerCase(), code)
      }
  } catch {
    /* no Intl.DisplayNames: globes only */
  }
}
export function flagFor(country: string): string {
  if (!map) build()
  const code = map!.get(country.trim().toLowerCase())
  if (!code) return '🌐'
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}
