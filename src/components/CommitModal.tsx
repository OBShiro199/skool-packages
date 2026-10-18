import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
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

      {createPortal(
        <AnimatePresence>
          {celebrating && (
            <motion.div className="yourein" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="yourein-inner" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
                <motion.div className="yourein-check" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 15 }}>
                  <svg viewBox="0 0 24 24" width="44" height="44"><motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="2.6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.45 }} /></svg>
                </motion.div>
                <motion.span className="label" style={{ color: '#7DF0B0' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>Pledge signed · {date}</motion.span>
                <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>You’re in.</motion.h1>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>Let’s start building <span className="serif" style={{ fontSize: '1.3em' }}>{app.name}</span>.</motion.p>
                <motion.button className="btn btn-lg" style={{ background: '#fff', color: '#0F0F0F', borderColor: '#fff' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                  onClick={() => { setCelebrating(false); onDone() }}>
                  Open my build <ArrowRight size={16} />
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
