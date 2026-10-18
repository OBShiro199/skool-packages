import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Send, X } from 'lucide-react'
import { useUser } from '../lib/store'
import { getApp } from '../content/apps'
import ollyPhoto from '../assets/olly.webp'

// Cosmetic support chat. Messages are kept in component state only; no backend yet.

function Avatar({ size = 44 }: { size?: number }) {
  return (
    <span className="olly-avatar" style={{ width: size, height: size }}>
      <img src={ollyPhoto} alt="Olly Rosewell" />
    </span>
  )
}

interface Msg { from: 'olly' | 'me'; text: string; at: string }

export function AskOlly() {
  const user = useUser()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const active = getApp(user?.activeApp)
  const time = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ from: 'olly', at: time(), text: `Hey ${user?.profile.name ?? 'there'}, Olly here. Stuck on a step${active ? ` in ${active.name}` : ''}? Tell me the step name and paste the exact error. I reply within one working day.` }])
    }
  }, [open]) // eslint-disable-line
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])

  const send = () => {
    const t = text.trim()
    if (!t) return
    setMsgs((m) => [...m, { from: 'me', text: t, at: time() }])
    setText('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMsgs((m) => [...m, { from: 'olly', at: time(), text: 'Got it, thanks. Your message is in my inbox and I will reply by email. For build errors, the Thursday build call is the fastest fix.' }])
    }, 1400)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div className="olly-panel" initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
            <div className="olly-head">
              <Avatar size={38} />
              <div style={{ flex: 1 }}>
                <b>Ask Olly</b>
                <span className="olly-status"><i /> Usually replies within a day</span>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)} aria-label="Close chat"><X size={16} /></button>
            </div>
            <div className="olly-body">
              {msgs.map((m, i) => (
                <motion.div key={i} className={`olly-msg ${m.from}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <p>{m.text}</p>
                  <span className="mono">{m.at}</span>
                </motion.div>
              ))}
              {typing && <div className="olly-msg olly typing"><span /><span /><span /></div>}
              <div ref={end} />
            </div>
            <form className="olly-input" onSubmit={(e) => { e.preventDefault(); send() }}>
              <textarea rows={2} placeholder="Which step, and what happened?" value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
              <button className="btn btn-primary btn-sm" disabled={!text.trim()} aria-label="Send"><Send size={14} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button className="olly-launcher" onClick={() => setOpen(!open)} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} aria-label="Ask Olly for support">
        <Avatar size={40} />
        <span className="olly-launch-text"><b>Ask Olly</b><small>for support</small></span>
        <i className="olly-dot" />
      </motion.button>
    </>
  )
}
