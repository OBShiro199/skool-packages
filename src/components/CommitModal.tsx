import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Eraser, PenLine } from 'lucide-react'
import type { AppDef } from '../content/types'
import { useStore, useUser } from '../lib/store'
import { Modal } from './Modal'
import { SignaturePad, type SignaturePadHandle } from './SignaturePad'
import { celebrate } from '../lib/confetti'

export function CommitModal({ app, open, onClose, onDone }: { app: AppDef; open: boolean; onClose: () => void; onDone: () => void }) {
  const user = useUser()!
  const commit = useStore((s) => s.commit)
  const pad = useRef<SignaturePadHandle>(null)
  const [empty, setEmpty] = useState(true)
  const [typed, setTyped] = useState(user.profile.name)
  const [agree, setAgree] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const ready = !empty && typed.trim().length > 1 && agree
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const sign = () => {
    if (!ready || !pad.current) return
    commit(app.slug, { signature: pad.current.toDataURL(), typedName: typed.trim() })
    onClose()
    setCelebrating(true)
    setTimeout(celebrate, 350)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Commit to ${app.name}`} icon={<PenLine size={16} />}
        footer={<><button className="btn" onClick={onClose}>Not yet</button><button className="btn btn-primary" disabled={!ready} onClick={sign}>Sign and unlock <ArrowRight size={15} /></button></>}>
        <div className="stack" style={{ gap: 18 }}>
          <div className="pledge">
            <span className="label">The founder pledge</span>
            <p>
              I, <b>{typed || '______'}</b>, commit to building <b>{app.name}</b> with this playbook and then marketing and selling it.
              {' '}{app.name} solves a problem people already pay for, so the build is the easy half. I will do the selling half:
            </p>
            <ul>
              <li>Finish the build phases within <b>{Math.ceil(app.buildHours / 5)} weeks</b> at 5 focused hours a week.</li>
              <li>Send <b>50 outreach touches a day</b> for 30 days after launch: emails, DMs or calls.</li>
              <li>Charge <b>${app.price.monthly}/month</b> after a {app.price.trialDays}-day trial from day one. No free forever plan.</li>
              <li>Post my progress in the Skool community every Friday.</li>
            </ul>
          </div>

          <div>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span className="label">Sign here</span>
              <button className="btn btn-sm btn-ghost" onClick={() => pad.current?.clear()}><Eraser size={14} /> Clear</button>
            </div>
            <div className={`sig-box ${empty ? '' : 'signed'}`}>
              <SignaturePad ref={pad} onChange={setEmpty} />
              {empty && <span className="sig-hint">Draw your signature with your mouse, finger or pen</span>}
              <span className="sig-line" />
              <span className="sig-x serif">x</span>
            </div>
          </div>

          <div className="grid cols-2" style={{ gap: 12 }}>
            <label className="field"><span>Full name</span><input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} /></label>
            <label className="field"><span>Date</span><input className="input mono" value={date} readOnly /></label>
          </div>

          <label className="agree">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I am committing to market and sell {app.name}, not only build it.</span>
          </label>
        </div>
      </Modal>

      <Modal open={celebrating} onClose={() => setCelebrating(false)} title="Pledge signed"
        footer={<><button className="btn" onClick={() => setCelebrating(false)}>Stay here</button><button className="btn btn-primary" onClick={() => { setCelebrating(false); onDone() }}>Open my build <ArrowRight size={15} /></button></>}>
        <div className="yourein-modal">
          <motion.div className="yourein-check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 320, damping: 16 }}>
            <svg viewBox="0 0 24 24" width="30" height="30"><motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="2.6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.4 }} /></svg>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>You’re in.</motion.h2>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>Let’s start building <b>{app.name}</b>.</motion.p>
          <motion.p className="muted" style={{ fontSize: 14 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            Signed {date}. Your first step is Setup: about an hour to get Claude Code running.
          </motion.p>
        </div>
      </Modal>
    </>
  )
}
