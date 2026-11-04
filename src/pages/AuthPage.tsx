import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Lock } from 'lucide-react'
import { normUsername, useStore, useUser } from '../lib/store'
import { avatarFor, reviews, tagHue } from '../content/reviews'
import skoolLogo from '../assets/skool-logo.png'
import '../styles/auth.css'

function Review({ r, hidden }: { r: (typeof reviews)[number]; hidden?: boolean }) {
  const src = avatarFor(r.handle)
  return (
    <figure className="q-review" aria-hidden={hidden || undefined}>
      <blockquote>{r.text}</blockquote>
      <figcaption>
        {src ? <img src={src} alt="" width={28} height={28} /> : <span className="q-initial">{r.handle[0].toUpperCase()}</span>}
        <span className="q-handle">@{r.handle}</span>
        <span className={`tag tag-${tagHue[r.tag]}`}>{r.tag}</span>
      </figcaption>
    </figure>
  )
}

const rows = [reviews.slice(0, 7), reviews.slice(7)]

function Reviews() {
  return (
    <div className="q-reviews" role="region" aria-label="What members say">
      {rows.map((row, n) => (
        <div key={n} className="q-marquee-wrap">
          <div className={`q-marquee ${n ? 'rev' : ''}`}>
            {row.map((r, i) => <Review key={i} r={r} />)}
            {row.map((r, i) => <Review key={`c${i}`} r={r} hidden />)}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AuthPage() {
  const user = useUser()
  const signIn = useStore((s) => s.signIn)
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={user.onboarding ? '/app' : '/onboarding'} replace />

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const u = normUsername(username)
    if (!/^[a-z0-9][a-z0-9._-]{1,59}$/.test(u)) return setError('Enter your Skool username, like olly-rosewell.')
    if (password.length < 8) return setError('Enter the password from your Skool DM.')
    setBusy(true)
    setTimeout(() => {
      const r = signIn(u, password)
      setBusy(false)
      if (!r.ok) return setError(r.error)
      nav('/', { replace: true })
    }, 450)
  }

  return (
    <div className="q-auth">
      <aside className="q-show">
        <Reviews />
      </aside>

      <main className="q-form-side">
        <div className="q-form-wrap">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <p className="q-eyebrow">Members only</p>
            <h1 className="q-title">Welcome to the vault.</h1>
            <p className="q-lede">Your login is your Skool username. Your password was sent to you in a DM on Skool.</p>

            <form onSubmit={submit} className="q-card laser laser-slow" noValidate>
              <label className="q-field">
                <span className="q-label">
                  <img src={skoolLogo} alt="Skool" height={13} /> username
                </span>
                <div className="q-input q-prefix">
                  <span className="q-pre">skool.com/@</span>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your-name" autoComplete="username" autoCapitalize="none" spellCheck={false} />
                </div>
                <small>The part after skool.com/@ on your Skool profile.</small>
              </label>
              <label className="q-field">
                <span>Password</span>
                <div className="q-input"><Lock size={16} strokeWidth={1.5} aria-hidden /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="From your Skool DM" autoComplete="current-password" /></div>
              </label>
              <p className="q-error" role="alert">{error}</p>
              <button className="q-btn" disabled={busy} aria-busy={busy}>
                <span className="q-btn-label">Sign in <ArrowRight size={16} strokeWidth={1.75} aria-hidden /></span>
                {busy && <span className="q-spinner" aria-hidden />}
              </button>
            </form>

            <p className="q-switch">
              Can't find the DM?{' '}
              <a href="https://www.skool.com/build-profitable-software" target="_blank" rel="noopener noreferrer">Message me on Skool</a>
            </p>
          </motion.div>
        </div>
        <p className="q-foot">Demo mode: logins are stored in this browser only.</p>
      </main>
    </div>
  )
}
