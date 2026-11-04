import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, Lock, User } from 'lucide-react'
import { normUsername, useStore, useUser } from '../lib/store'
import { avatarFor, reviews, tagHue } from '../content/reviews'
import { Included } from '../components/Included'
import skoolLogo from '../assets/skool-logo.png'
import ollyLogo from '../assets/brand-face.webp'
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
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin'
  const user = useUser()
  const signUp = useStore((s) => s.signUp)
  const signIn = useStore((s) => s.signIn)
  const nav = useNavigate()
  const [name, setName] = useState('')
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
    if (password.length < 8) return setError('Password needs at least 8 characters.')
    if (mode === 'signup' && name.trim().length < 2) return setError('Tell us your first name.')
    setBusy(true)
    setTimeout(() => {
      const r = mode === 'signup' ? signUp(name, u, password) : signIn(u, password)
      setBusy(false)
      if (!r.ok) return setError(r.error)
      nav(mode === 'signup' ? '/onboarding' : '/', { replace: true })
    }, 450)
  }

  return (
    <div className="q-auth">
      <aside className="q-show">
        <div className="q-brand">
          <img src={ollyLogo} alt="" width={28} height={28} />
          <b>Build a Profitable $10K p/m App</b>
        </div>

        <div className="q-show-copy">
          <div className="q-skool laser">
            <span>A private</span>
            <img src={skoolLogo} alt="Skool" height={16} />
            <span>community</span>
          </div>
          <h2>Everything you need to build a profitable $10K p/m SaaS.</h2>
          <p>The leads, the course, the apps, the calls and a live build to $10K/month. All of it unlocks the moment you sign in.</p>
        </div>

        <Included />
        <Reviews />
      </aside>

      <main className="q-form-side">
        <div className="q-form-wrap">
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
              <p className="q-eyebrow">{mode === 'signup' ? 'Members only · Step 1 of 2' : 'Members only'}</p>
              <h1 className="q-title">{mode === 'signup' ? 'Unlock the vault.' : 'Welcome back.'}</h1>
              <p className="q-lede">
                {mode === 'signup'
                  ? 'Create your vault login with the same username you use on Skool.'
                  : 'Sign in with your Skool username to pick up where you left off.'}
              </p>

              <form onSubmit={submit} className="q-card laser laser-slow" noValidate>
                {mode === 'signup' && (
                  <label className="q-field">
                    <span>First name</span>
                    <div className="q-input"><User size={16} strokeWidth={1.5} aria-hidden /><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Olly" autoComplete="given-name" /></div>
                  </label>
                )}
                <label className="q-field">
                  <span>Skool username</span>
                  <div className="q-input q-prefix">
                    <span className="q-pre">skool.com/@</span>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your-name" autoComplete="username" autoCapitalize="none" spellCheck={false} />
                  </div>
                  <small>The part after skool.com/@ on your Skool profile.</small>
                </label>
                <label className="q-field">
                  <span>Password</span>
                  <div className="q-input"><Lock size={16} strokeWidth={1.5} aria-hidden /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></div>
                </label>
                <p className="q-error" role="alert">{error}</p>
                <button className="q-btn" disabled={busy} aria-busy={busy}>
                  <span className="q-btn-label">{mode === 'signup' ? 'Create my login' : 'Sign in'} <ArrowRight size={16} strokeWidth={1.75} aria-hidden /></span>
                  {busy && <span className="q-spinner" aria-hidden />}
                </button>
              </form>

              <p className="q-switch">
                {mode === 'signup' ? 'Already have a login? ' : 'First time here? '}
                <a href="#" onClick={(e) => { e.preventDefault(); setError(''); setParams(mode === 'signup' ? {} : { mode: 'signup' }) }}>
                  {mode === 'signup' ? 'Sign in' : 'Create your login'}
                </a>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="q-foot">Demo mode: logins are stored in this browser only.</p>
      </main>
    </div>
  )
}
