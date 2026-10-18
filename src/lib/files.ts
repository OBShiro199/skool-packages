// Inside the claude.ai artifact viewer a plain <a download> is blocked; the page asks the
// viewer to save through the `downloads` capability instead. Elsewhere we use a normal link.
type DownloadsNs = { save: (r: { filename: string; data: Blob }) => Promise<unknown> }
const ALLOWED = /\.(gif|png|jpe?g|webp|mp4|webm|mov|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip)$/i
let viewerDownloads: Promise<DownloadsNs | null> | null = null
function getViewerDownloads(): Promise<DownloadsNs | null> {
  const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude
  if (!c?.use) return Promise.resolve(null)
  viewerDownloads ??= c.use('downloads').then((ns) => (ns as DownloadsNs) ?? null).catch(() => null)
  return viewerDownloads
}

export async function downloadBlob(blob: Blob, filename: string) {
  const viewer = await getViewerDownloads()
  if (viewer) {
    // .sql and .env.example are not on the viewer's allowlist: save them as text.
    const name = ALLOWED.test(filename) ? filename : `${filename}.txt`
    try { await viewer.save({ filename: name, data: blob }) } catch { /* declined or unavailable */ }
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text: string, filename: string) {
  downloadBlob(new Blob([text], { type: 'text/markdown;charset=utf-8' }), filename)
}

/** Text PDF of a markdown doc. Monospace so code and tables keep their shape. */
export async function downloadPdf(title: string, markdown: string, filename: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 48
  let y = M

  doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text(title, M, y); y += 14
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120)
  doc.text('BPA Vault · paste this into Claude Code', M, y + 8); y += 30
  doc.setTextColor(20)

  const ascii = markdown.replace(/[^\x09\x0A\x0D\x20-\x7E£]/g, (c) => ({ '→': '->', '←': '<-', '…': '...', '’': "'", '‘': "'", '“': '"', '”': '"', '•': '-', '✓': 'v', '×': 'x' } as Record<string, string>)[c] ?? '')
  let inCode = false
  for (const raw of ascii.split('\n')) {
    if (/^```/.test(raw)) { inCode = !inCode; continue }
    let size = 10, font: 'helvetica' | 'courier' = 'helvetica', style: 'normal' | 'bold' = 'normal', text = raw, gap = 4
    if (inCode || /^\|/.test(raw)) { font = 'courier'; size = 8.5 }
    else if (/^#\s/.test(raw)) { size = 16; style = 'bold'; text = raw.slice(2); gap = 10 }
    else if (/^##\s/.test(raw)) { size = 13; style = 'bold'; text = raw.slice(3); gap = 8 }
    else if (/^###+\s/.test(raw)) { size = 11; style = 'bold'; text = raw.replace(/^#+\s/, ''); gap = 6 }
    else text = raw.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')
    doc.setFont(font, style); doc.setFontSize(size)
    const wrapped: string[] = text ? doc.splitTextToSize(text, W - M * 2) : ['']
    if (style === 'bold') y += gap
    for (const w of wrapped) {
      if (y > H - M) { doc.addPage(); y = M }
      doc.text(w, M, y)
      y += size * 1.38
    }
  }
  await downloadBlob(doc.output('blob'), filename)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch { ok = false }
    ta.remove()
    return ok
  }
}
