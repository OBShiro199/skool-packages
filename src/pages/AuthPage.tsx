import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, KeyRound, Lock, Mail } from 'lucide-react'
import { normUsername, useStore, useUser } from '../lib/store'
import { api, ApiError } from '../leads/api'
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

const HAS_ACCOUNT = 'vault-has-account'
const remembered = () => { try { return localStorage.getItem(HAS_ACCOUNT) === '1' } catch { return false } }
const remember = () => { try { localStorage.setItem(HAS_ACCOUNT, '1') } catch { /* private mode */ } }

export default function AuthPage() {
  const user = useUser()
  const hydrate = useStore((s) => s.hydrate)
  const localSignIn = useStore((s) => s.signIn)
  const nav = useNavigate()
  const [mode, setMode] = useState<'signin' | 'create'>(remembered() ? 'signin' : 'create')
  const [handle, setHandle] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/app" replace />

  const preview = !!import.meta.env.VITE_HASH_ROUTER
  const switchTo = (m: 'signin' | 'create') => { setMode(m); setError('') }

  const finish = async () => {
    remember()
    const st = await api.me()
    hydrate(st)
    nav('/app', { replace: true })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const em = email.trim().toLowerCase()
    const h = normUsername(handle)
    if (mode === 'create' && !/^[a-z0-9][a-z0-9._-]{1,59}$/.test(h)) return setError('Enter your Skool handle, the part after skool.com/@.')
    if (!preview && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return setError(mode === 'create' ? 'Enter your best email address.' : 'Enter the email you signed up with.')
    if (password.length < 8) return setError(mode === 'create' ? 'Choose a password of at least 8 characters.' : 'Enter your password.')
    if (mode === 'create' && !preview && code.trim().length < 4) return setError('Enter the member code from your Skool DM.')
    setBusy(true)
    if (preview) {
      // Shareable previews have no server: keep the in-browser demo login.
      localSignIn(h || em.split('@')[0] || 'member', password)
      setBusy(false)
      return nav('/app', { replace: true })
    }
    // Progress this browser kept before accounts existed comes along into the new account.
    const old = mode === 'create' ? useStore.getState().users[h] : undefined
    const imported = old ? { commitments: old.commitments, progress: old.progress, activeDays: old.activeDays, tourDone: old.tourDone, activeApp: old.activeApp } : undefined
    const go = mode === 'create'
      ? api.signup({ handle: h, name: name.trim() || h, email: em, password, code: code.trim(), import: imported })
      : api.login(em, password)
    go.then(finish)
      .catch((err) => {
        if (err instanceof ApiError && (err.code === 'handle_taken' || err.code === 'email_taken')) { switchTo('signin'); setPassword('') }
        setError(err instanceof ApiError ? err.message : 'Could not reach the server. Try again.')
      })
      .finally(() => setBusy(false))
  }

  const create = mode === 'create'
  return (
    <div className="q-auth">
      <aside className="q-show">
        <Reviews />
      </aside>

      <main className="q-form-side">
        <div className="q-form-wrap">
          <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <p className="q-eyebrow">Members only</p>
            <h1 className="q-title">{create ? 'Create your vault account.' : 'Welcome back.'}</h1>
            <p className="q-lede">
              {create
                ? 'Set it up once. Your progress, lists and exports save to your account on every device.'
                : 'Sign in with your email and password.'}
            </p>

            <div className="q-modes" role="tablist" aria-label="Account">
              <button type="button" role="tab" aria-selected={!create} className={!create ? 'on' : ''} onClick={() => switchTo('signin')}>Already a member</button>
              <button type="button" role="tab" aria-selected={create} className={create ? 'on' : ''} onClick={() => switchTo('create')}>New here</button>
            </div>

            <form onSubmit={submit} className={`q-card laser laser-slow ${create ? 'q-compact' : ''}`} noValidate>
              {create && (
                <div className="q-row2">
                  <label className="q-field">
                    <span className="q-label"><img src={skoolLogo} alt="Skool" height={13} /> handle</span>
                    <div className="q-input q-prefix">
                      <span className="q-pre">skool.com/@</span>
                      <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="your-name" autoComplete="nickname" autoCapitalize="none" spellCheck={false} />
                    </div>
                  </label>
                  <label className="q-field">
                    <span>Your name</span>
                    <div className="q-input"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" autoComplete="given-name" /></div>
                  </label>
                </div>
              )}
              <label className="q-field">
                <span>{create ? 'Best email' : 'Email'}</span>
                <div className="q-input"><Mail size={16} strokeWidth={1.5} aria-hidden /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" autoCapitalize="none" spellCheck={false} /></div>
              </label>
              <label className="q-field">
                <span>{create ? 'Choose a password' : 'Password'}</span>
                <div className="q-input"><Lock size={16} strokeWidth={1.5} aria-hidden /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={create ? 'At least 8 characters' : 'Your password'} autoComplete={create ? 'new-password' : 'current-password'} /></div>
              </label>
              {create && (
                <label className="q-field">
                  <span>Member code</span>
                  <div className="q-input"><KeyRound size={16} strokeWidth={1.5} aria-hidden /><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="From your Skool DM" autoComplete="off" autoCapitalize="none" spellCheck={false} /></div>
                </label>
              )}
              <p className="q-error" role="alert">{error}</p>
              <button className="q-btn" disabled={busy} aria-busy={busy}>
                <span className="q-btn-label">{create ? 'Create account' : 'Sign in'} <ArrowRight size={16} strokeWidth={1.75} aria-hidden /></span>
                {busy && <span className="q-spinner" aria-hidden />}
              </button>
            </form>

            <p className="q-switch">
              {create ? "Can't find the member code? " : 'Forgot your password? '}
              <a href="https://www.skool.com/build-profitable-software" target="_blank" rel="noopener noreferrer">Message me on Skool</a>
            </p>
          </motion.div>
        </div>
        {preview && <p className="q-foot">Preview: logins are stored in this browser only.</p>}
      </main>
    </div>
  )
}
