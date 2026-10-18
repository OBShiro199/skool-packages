import { useContext, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Database, Download, ExternalLink, Eye, FileText, KeyRound, Megaphone, Package, TerminalSquare } from 'lucide-react'
import type { AppDef } from '../content/types'
import { kitDownloads, type Downloadable } from '../lib/downloads'
import { downloadPdf, downloadText } from '../lib/files'
import { Markdown } from '../lib/markdown'
import { hasLanding } from '../landings'
import { Modal } from './Modal'
import { TriggerContext } from './Blocks'
import { toast } from './Toasts'

const ICON = { doc: FileText, sql: Database, prompts: TerminalSquare, env: KeyRound, scripts: Megaphone }

export function DownloadsPanel({ app, onZip }: { app: AppDef; onZip: () => void }) {
  const files = useMemo(() => kitDownloads(app), [app])
  const fire = useContext(TriggerContext)
  const [preview, setPreview] = useState<Downloadable | null>(null)
  const totalLines = files.reduce((n, f) => n + f.content.split('\n').length, 0)

  const get = (f: Downloadable, as: 'file' | 'pdf') => {
    if (as === 'pdf') downloadPdf(f.title, f.content, f.filename.replace(/\.\w+$/, '') + '.pdf')
    else downloadText(f.content, f.filename)
    if (f.trigger) fire(f.trigger)
    toast(`Downloaded ${as === 'pdf' ? f.filename.replace(/\.\w+$/, '.pdf') : f.filename}`)
  }

  return (
    <div className="dl">
      <div className="dl-hero">
        <div>
          <b>Everything for {app.name} in one place</b>
          <p className="muted">{files.length} files, {totalLines.toLocaleString()} lines. Save the .md files into your project folder so Claude Code can read them with @PRD.md, @DESIGN.md and so on.</p>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <button className="btn btn-primary" onClick={onZip}><Package size={15} /> Starter pack .zip</button>
          {hasLanding(app.slug) && <Link className="btn" to={`/landing/${app.slug}`}>See the finished landing page <ExternalLink size={13} /></Link>}
        </div>
      </div>

      <div className="dl-list">
        {files.map((f) => {
          const I = ICON[f.kind]
          return (
            <div key={f.id} className="dl-row">
              <span className="dl-icon"><I size={16} /></span>
              <div className="dl-text">
                <div className="row wrap" style={{ gap: 8 }}><b>{f.title}</b><code>{f.filename}</code></div>
                <p className="muted">{f.use}</p>
                <span className="label">Save to: {f.saveTo} · {f.content.split('\n').length.toLocaleString()} lines</span>
              </div>
              <div className="dl-actions">
                <button className="btn btn-sm" onClick={() => setPreview(f)}><Eye size={13} /> Preview</button>
                {(f.kind === 'doc' || f.kind === 'prompts' || f.kind === 'scripts') && <button className="btn btn-sm" onClick={() => get(f, 'pdf')}>PDF</button>}
                <button className="btn btn-sm btn-primary" onClick={() => get(f, 'file')}><Download size={13} /> {f.filename.split('.').pop() === 'example' ? '.env.example' : '.' + f.filename.split('.').pop()}</button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? ''} wide icon={<FileText size={16} />}
        footer={preview && <button className="btn btn-primary" onClick={() => get(preview, 'file')}><Download size={14} /> Download {preview.filename}</button>}>
        {preview && (preview.kind === 'sql' || preview.kind === 'env'
          ? <pre className="dl-pre">{preview.content}</pre>
          : <Markdown source={preview.content} />)}
      </Modal>
    </div>
  )
}
