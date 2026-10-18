import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Download, FolderDown, Package } from 'lucide-react'
import type { AppDef } from '../content/types'
import { downloadStarterZip, oneShotPrompt } from '../lib/zip'
import { Modal } from './Modal'
import { BlockView } from './Blocks'
import { toast } from './Toasts'

export function DownloadCodeModal({ app, open, onClose }: { app: AppDef; open: boolean; onClose: () => void }) {
  const [state, setState] = useState<'idle' | 'zipping' | 'done'>('idle')
  const [pct, setPct] = useState(0)

  const go = async () => {
    setState('zipping')
    setPct(0)
    const files = ['PRD.md', 'DESIGN.md', 'PROMPTS.md', 'supabase/migrations/0001_init.sql', ...app.content.starterFiles.map((f) => f.path)]
    for (let i = 0; i < files.length; i++) {
      await new Promise((r) => setTimeout(r, 120))
      setPct((i + 1) / files.length)
    }
    await downloadStarterZip(app)
    setState('done')
    toast(`${app.slug}-starter-pack.zip downloaded`)
  }

  const tree = [
    `${app.slug}/`,
    '├── START-HERE.md        the prompt to paste first',
    '├── PRD.md               full build spec',
    '├── DESIGN.md            full UI/UX spec',
    '├── PROMPTS.md           every playbook prompt, in order',
    '├── CLAUDE.md            rules Claude reads every session',
    '├── .env.example         every key you need',
    '└── supabase/',
    '    ├── migrations/0001_init.sql',
    `    └── functions/       ${app.content.edgeFunctions.length} edge function skeletons`,
  ].join('\n')

  return (
    <Modal open={open} onClose={onClose} title={`Download the ${app.name} starter pack`} wide icon={<Package size={16} />}
      footer={<><button className="btn" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={go} disabled={state === 'zipping'}>{state === 'done' ? <><Check size={15} /> Download again</> : <><Download size={15} /> Download .zip</>}</button></>}>
      <div className="stack" style={{ gap: 18 }}>
        <p className="muted">The fast path. One zip with the PRDs, the database, every prompt and the function skeletons. Unzip it, open Claude Code in the folder and paste one prompt. Claude builds the whole app from the specs. Use the phase tabs when you want to understand or redo a part.</p>

        <div className="grid cols-2" style={{ gap: 16 }}>
          <BlockView b={{ type: 'ascii', code: tree, caption: 'What is inside the zip' }} />
          <div className="zip-box">
            <FolderDown size={28} />
            <b>{app.slug}-starter-pack.zip</b>
            {state === 'idle' && <span className="muted" style={{ fontSize: 13 }}>Ready when you are</span>}
            {state !== 'idle' && (
              <div style={{ width: '100%' }}>
                <div className="bar lg"><motion.i animate={{ width: `${pct * 100}%` }} /></div>
                <span className="label" style={{ display: 'block', marginTop: 6 }}>{state === 'done' ? 'Downloaded' : `Packing ${Math.round(pct * 100)}%`}</span>
              </div>
            )}
            <button className="btn btn-primary btn-block" onClick={go} disabled={state === 'zipping'}><Download size={15} /> {state === 'done' ? 'Download again' : 'Download .zip'}</button>
          </div>
        </div>

        <div>
          <span className="label">Then do this</span>
          <BlockView b={{ type: 'steps', items: [
            `Unzip the file. Move the \`${app.slug}\` folder somewhere you keep projects, e.g. your Documents folder.`,
            `Open a terminal in that folder. Mac: \`cd ~/Documents/${app.slug}\`. Windows: \`cd $HOME\\Documents\\${app.slug}\`.`,
            'Run `claude` and log in if asked.',
            'Paste the prompt below. Claude reads every spec, writes a plan and waits for your approval.',
            'Approve the plan. Keep the Backend, Payments and Deployment tabs open: Claude will ask for the keys they show you how to get.',
          ] }} />
        </div>
        <BlockView b={{ type: 'prompt', id: 'zip-oneshot', title: 'Build from the starter pack', code: oneShotPrompt(app) }} />
      </div>
    </Modal>
  )
}
