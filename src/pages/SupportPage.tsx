import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, ChevronDown, ExternalLink, MessageSquare, Send } from 'lucide-react'
import { useUser } from '../lib/store'
import { APPS } from '../content/apps'
import { toast } from '../components/Toasts'

const FAQ = [
  { q: 'Claude Code says "command not found"', a: 'Close the terminal and open a new one so it picks up the install. Then run `claude --version`. Still failing: run `claude doctor` and paste the output into a support ticket.' },
  { q: 'My SQL failed halfway in Supabase', a: 'Copy the red error line. Most common cause is running the file twice. Open a new query, run `drop schema public cascade; create schema public;` only on a fresh project with no real data, then run the kit SQL once.' },
  { q: 'Sign up works locally but not on Vercel', a: 'Add your Vercel URL to Supabase > Authentication > URL Configuration as the Site URL and as a Redirect URL. Then redeploy on Vercel.' },
  { q: 'Stripe webhook returns 400', a: 'The signing secret does not match. Local testing uses the `whsec_` printed by `stripe listen`. Production uses the one from the endpoint in the Stripe dashboard. They are different.' },
  { q: 'Can I change the price or trial length?', a: 'Yes. Edit the price in Stripe and the `trial_period_days` value in your checkout route. The playbook uses the kit default so the marketing maths works.' },
  { q: 'Can I build more than one kit?', a: 'Yes, but finish the selling phases on one first. Every kit you start appears under Your builds in the sidebar with its own progress.' },
  { q: 'Is the starter pack the finished code?', a: 'No. It is every spec, the database and the prompts, packed so Claude Code can build the whole app in one guided session. You still run it and approve each step.' },
]

export default function SupportPage() {
  const user = useUser()!
  const [open, setOpen] = useState<number | null>(0)
  const [sent, setSent] = useState(false)
  const [topic, setTopic] = useState(user.activeApp ?? '')
  const [msg, setMsg] = useState('')

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">Support</span>
        <h1>Stuck on a step? Get unstuck today.</h1>
        <p>Check the common fixes first. If it is not there, send a ticket with the step name and the exact error. Replies within one working day.</p>
      </header>

      <div className="grid cols-3" style={{ marginBottom: 28 }}>
        <a className="card support-tile" href="https://www.skool.com/solo-saas-mastermind-7774" target="_blank" rel="noreferrer"><MessageSquare size={18} /><b>Ask the community</b><span className="muted">Post in Skool with the #help tag. Fastest for build questions.</span><span className="label">Open Skool <ExternalLink size={10} /></span></a>
        <div className="card support-tile"><CalendarClock size={18} /><b>Weekly build call</b><span className="muted">Live screen-share fixes every Thursday, 6pm UK. Link in the Skool calendar.</span><span className="label">Thursdays · 60 min</span></div>
        <div className="card support-tile"><Send size={18} /><b>Private ticket</b><span className="muted">For billing or anything with keys or screenshots you do not want public.</span><span className="label">Form below</span></div>
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <section>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Common fixes</h2>
          <div className="faq">
            {FAQ.map((f, i) => (
              <div key={f.q} className={`faq-item ${open === i ? 'open' : ''}`}>
                <button onClick={() => setOpen(open === i ? null : i)}><span>{f.q}</span><ChevronDown size={16} /></button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                      <p className="muted" dangerouslySetInnerHTML={{ __html: f.a.replace(/`([^`]+)`/g, '<code>$1</code>') }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Send a ticket</h2>
          {sent ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stack">
              <b>Ticket sent.</b>
              <p className="muted">We will reply to {user.profile.email} within one working day.</p>
              <button className="btn" style={{ justifySelf: 'start' }} onClick={() => { setSent(false); setMsg('') }}>Send another</button>
            </motion.div>
          ) : (
            <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); if (msg.trim().length < 10) return toast('Add a bit more detail first'); setSent(true); toast('Ticket sent') }}>
              <label className="field"><span>Which build?</span>
                <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
                  <option value="">General / billing</option>
                  {APPS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
                </select>
              </label>
              <label className="field"><span>What happened?</span>
                <textarea className="input" rows={6} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Step: Backend > Run the SQL. Error: relation 'profiles' already exists…" />
              </label>
              <p className="label" style={{ textTransform: 'none', letterSpacing: 0 }}>Never paste secret keys (sb_secret_, sk_live_, whsec_) into a ticket.</p>
              <button className="btn btn-primary" style={{ justifySelf: 'start' }}><Send size={15} /> Send ticket</button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
