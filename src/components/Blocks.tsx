import { createContext, useContext, useState } from 'react'
import { Check, Copy, Download, FileText, Lightbulb, AlertTriangle, Baby, ExternalLink, Eye, TerminalSquare } from 'lucide-react'
import type { Block } from '../content/types'
import { copyText, downloadPdf, downloadText } from '../lib/files'
import { inline, Markdown } from '../lib/markdown'
import { Modal } from './Modal'
import { toast } from './Toasts'

/** Lets blocks auto-tick checklist items ("copy:<id>" / "download:<id>"). */
export const TriggerContext = createContext<(trigger: string) => void>(() => {})

function CopyBtn({ text, id, label = 'Copy' }: { text: string; id: string; label?: string }) {
  const fire = useContext(TriggerContext)
  const [done, setDone] = useState(false)
  return (
    <button
      className={`btn btn-sm ${done ? 'btn-signal' : ''}`}
      onClick={async () => {
        const ok = await copyText(text)
        if (ok) {
          setDone(true)
          fire(`copy:${id}`)
          toast('Copied to clipboard')
          setTimeout(() => setDone(false), 1800)
        } else toast('Copy blocked. Select the text and press Ctrl/Cmd+C.')
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? 'Copied' : label}
    </button>
  )
}

function DocBlock({ b }: { b: Extract<Block, { type: 'doc' }> }) {
  const fire = useContext(TriggerContext)
  const [open, setOpen] = useState(false)
  const lines = b.content.split('\n').length
  const words = b.content.split(/\s+/).length
  const dl = (kind: 'md' | 'pdf') => {
    if (kind === 'md') downloadText(b.content, b.filename)
    else downloadPdf(b.title, b.content, b.filename.replace(/\.md$/, '.pdf'))
    fire(`download:${b.id}`)
    toast(`Downloaded ${kind === 'md' ? b.filename : b.filename.replace(/\.md$/, '.pdf')}`)
  }
  return (
    <div className="blk-doc">
      <div className="blk-doc-icon"><FileText size={22} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row wrap" style={{ gap: 8 }}>
          <b>{b.title}</b>
          <span className="chip">{b.filename}</span>
          <span className="label">{lines} lines · {words.toLocaleString()} words</span>
        </div>
        <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>{b.summary}</p>
        <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
          <button className="btn btn-sm btn-primary" onClick={() => dl('md')}><Download size={14} /> Download .md</button>
          <button className="btn btn-sm" onClick={() => dl('pdf')}><Download size={14} /> PDF</button>
          <button className="btn btn-sm" onClick={() => setOpen(true)}><Eye size={14} /> Preview</button>
          <CopyBtn text={b.content} id={b.id} label="Copy all" />
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={b.title} wide icon={<FileText size={16} />}
        footer={<><CopyBtn text={b.content} id={b.id} label="Copy all" /><button className="btn btn-primary" onClick={() => dl('md')}><Download size={14} /> Download {b.filename}</button></>}>
        <Markdown source={b.content} />
      </Modal>
    </div>
  )
}

export function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case 'p':
      return <p className="blk-p">{inline(b.text)}</p>
    case 'callout': {
      const Icon = b.tone === 'eli5' ? Baby : b.tone === 'tip' ? Lightbulb : AlertTriangle
      return (
        <div className={`blk-callout ${b.tone}`}>
          <div className="row" style={{ gap: 8 }}>
            <Icon size={15} />
            <span className="label" style={{ color: 'inherit' }}>{b.tone === 'eli5' ? 'Explain like I’m 5' : b.tone === 'tip' ? 'Tip' : 'Watch out'}</span>
            <b style={{ fontSize: 14 }}>{b.title}</b>
          </div>
          <p>{inline(b.text)}</p>
        </div>
      )
    }
    case 'steps':
      return (
        <ol className="blk-steps">
          {b.items.map((s, i) => <li key={i}><span className="n mono">{String(i + 1).padStart(2, '0')}</span><span>{inline(s)}</span></li>)}
        </ol>
      )
    case 'code':
      return (
        <div className="blk-code">
          <div className="blk-code-head">
            <span className="mono">{b.filename}</span>
            <span className="label">{b.lang}</span>
            <span style={{ flex: 1 }} />
            <CopyBtn text={b.code} id={b.id} />
          </div>
          <pre><code>{b.code}</code></pre>
        </div>
      )
    case 'prompt':
      return (
        <div className="blk-term">
          <div className="blk-term-head">
            <TerminalSquare size={14} />
            <span className="mono">Paste into Claude Code</span>
            <span className="muted-t">· {b.title}</span>
            <span style={{ flex: 1 }} />
            <CopyBtn text={b.code} id={b.id} label="Copy prompt" />
          </div>
          <pre><span className="caret">&gt; </span>{b.code}</pre>
        </div>
      )
    case 'doc':
      return <DocBlock b={b} />
    case 'keys':
      return (
        <div className="blk-table">
          <table>
            <thead><tr><th>Key</th><th>Where to find it</th><th>Paste into</th><th /></tr></thead>
            <tbody>
              {b.rows.map((r) => (
                <tr key={r.name}>
                  <td><code>{r.name}</code></td>
                  <td>{inline(r.where)}</td>
                  <td><span className="chip">{r.pasteInto}</span></td>
                  <td>{r.secret ? <span className="chip" style={{ color: 'var(--loss)', borderColor: 'var(--loss)' }}>secret</span> : <span className="chip">public</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'ascii':
      return (
        <figure className="blk-ascii">
          <pre>{b.code}</pre>
          <figcaption>{b.caption}</figcaption>
        </figure>
      )
    case 'table':
      return (
        <div className="blk-table">
          <table>
            <thead><tr>{b.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
    case 'links':
      return (
        <div className="row wrap" style={{ gap: 8 }}>
          {b.items.map((l) => (
            <a key={l.url} className="btn btn-sm" href={l.url} target="_blank" rel="noreferrer">{l.label} <ExternalLink size={13} /></a>
          ))}
        </div>
      )
    case 'mistakes':
      return (
        <div className="blk-mistakes">
          {b.items.map((m, i) => (
            <div key={i} className="pair">
              <div><span className="label" style={{ color: 'var(--loss)' }}>Mistake</span><p>{inline(m.mistake)}</p></div>
              <div><span className="label" style={{ color: 'var(--money)' }}>Fix</span><p>{inline(m.fix)}</p></div>
            </div>
          ))}
        </div>
      )
  }
}

export { Markdown }
