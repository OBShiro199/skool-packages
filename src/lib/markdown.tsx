import { Fragment, type ReactNode } from 'react'

// Small markdown renderer for PRDs: headings, lists, tables, code fences,
// blockquotes, rules, **bold**, *italic*, `code` and [links](url).

export function inline(text: string, keyBase = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*\s][^*]*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyBase}-${k++}`
    if (tok.startsWith('**')) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`')) out.push(<code key={key}>{tok.slice(1, -1)}</code>)
    else if (tok.startsWith('[')) {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!
      out.push(<a key={key} href={mm[2]} target="_blank" rel="noreferrer">{mm[1]}</a>)
    } else out.push(<em key={key}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r/g, '').split('\n')
  const nodes: ReactNode[] = []
  let i = 0
  let key = 0
  const k = () => `b${key++}`

  while (i < lines.length) {
    const line = lines[i]
    if (/^```/.test(line)) {
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++])
      i++
      nodes.push(<pre key={k()}><code>{buf.join('\n')}</code></pre>)
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const lvl = Math.min(h[1].length, 3)
      const Tag = (`h${lvl}`) as 'h1' | 'h2' | 'h3'
      nodes.push(<Tag key={k()}>{inline(h[2])}</Tag>)
      i++
      continue
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { nodes.push(<hr key={k()} />); i++; continue }
    if (/^\|.*\|\s*$/.test(line)) {
      const rows: string[][] = []
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i].trim().slice(1, -1).split('|').map((c) => c.trim())
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells)
        i++
      }
      const [head, ...body] = rows
      nodes.push(
        <table key={k()}>
          <thead><tr>{head.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
          <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
        </table>,
      )
      continue
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''))
        i++
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) items[items.length - 1] += ' ' + lines[i++].trim()
      }
      const lis = items.map((t, j) => {
        const box = /^\[( |x)\]\s+(.*)$/.exec(t)
        return <li key={j}>{box ? <>{box[1] === 'x' ? '☑' : '☐'} {inline(box[2])}</> : inline(t)}</li>
      })
      nodes.push(ordered ? <ol key={k()}>{lis}</ol> : <ul key={k()}>{lis}</ul>)
      continue
    }
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''))
      nodes.push(<blockquote key={k()}>{inline(buf.join(' '))}</blockquote>)
      continue
    }
    if (!line.trim()) { i++; continue }
    const buf: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\||>|\s*([-*+]|\d+\.)\s+)/.test(lines[i])) buf.push(lines[i++])
    nodes.push(<p key={k()}>{inline(buf.join(' '))}</p>)
  }
  return <div className="prose">{nodes.map((n, j) => <Fragment key={j}>{n}</Fragment>)}</div>
}
