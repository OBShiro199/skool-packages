import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, Info, Lock, Mail, User } from 'lucide-react'
import { useStore, useUser } from '../lib/store'
import { APPS } from '../content/apps'
import { AppArt } from '../components/AppArt'
import { BrandMark } from '../components/Brand'

export default function AuthPage() {
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'signin' ? 'signin' : 'signup'
  const user = useUser()
  const signUp = useStore((s) => s.signUp)
  const signIn = useStore((s) => s.signIn)
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={user.onboarding ? '/app' : '/onboarding'} replace />

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    if (password.length < 8) return setError('Password needs at least 8 characters.')
    if (mode === 'signup' && name.trim().length < 2) return setError('Tell us your first name.')
    setBusy(true)
    setTimeout(() => {
      const r = mode === 'signup' ? signUp(name, email, password) : signIn(email, password)
      setBusy(false)
      if (!r.ok) return setError(r.error)
      nav(mode === 'signup' ? '/onboarding' : '/', { replace: true })
    }, 450)
  }

  return (
    <div className="auth">
      <div className="auth-left">
        <div className="brand" style={{ padding: 0 }}>
          <BrandMark />
          <div><b>BPA Vault</b><small>Build $10K p/m Profitable Apps</small></div>
        </div>

        <div className="auth-form-wrap">
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              <span className="label">{mode === 'signup' ? 'Members only · Step 1 of 2' : 'Welcome back'}</span>
              <h1 className="auth-title">{mode === 'signup' ? 'Unlock the vault.' : 'Sign in to keep building.'}</h1>
              <p className="muted" style={{ marginBottom: 24, fontSize: 15 }}>
                {mode === 'signup'
                  ? '20 SaaS build kits for Claude Code. Pick one, follow the checklist, ship it, sell it.'
                  : 'Your progress is saved. Pick up exactly where you left off.'}
              </p>

              {mode === 'signup' && (
                <div className="skool-note">
                  <Info size={16} style={{ flex: 'none', marginTop: 2 }} />
                  <div>
                    <b>Use the same email as your Skool account.</b>
                    <span> That is how we match your membership to the vault. A different email means no access.</span>
                  </div>
                </div>
              )}

              <form onSubmit={submit} className="stack" style={{ gap: 14 }} noValidate>
                {mode === 'signup' && (
                  <label className="field">
                    <span>First name</span>
                    <div className="input-icon"><User size={16} /><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Olly" autoComplete="given-name" /></div>
                  </label>
                )}
                <label className="field">
                  <span>{mode === 'signup' ? 'Skool email' : 'Email'}</span>
                  <div className="input-icon"><Mail size={16} /><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
                </label>
                <label className="field">
                  <span>Password</span>
                  <div className="input-icon"><Lock size={16} /><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></div>
                </label>
                {error && <motion.div initial={{ x: -6 }} animate={{ x: [6, -4, 2, 0] }} className="auth-error">{error}</motion.div>}
                <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
                  {busy ? <span className="spinner" /> : <>{mode === 'signup' ? 'Create my account' : 'Sign in'} <ArrowRight size={16} /></>}
                </button>
              </form>

              <p className="muted" style={{ marginTop: 18, fontSize: 14 }}>
                {mode === 'signup' ? 'Already a member? ' : 'New here? '}
                <a href="#" onClick={(e) => { e.preventDefault(); setError(''); setParams(mode === 'signup' ? { mode: 'signin' } : {}) }}>
                  {mode === 'signup' ? 'Sign in' : 'Create an account'}
                </a>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="label" style={{ textTransform: 'none', letterSpacing: 0 }}>Demo mode: accounts are stored in this browser only.</p>
      </div>

      <div className="auth-right" aria-hidden>
        <div className="auth-marquee">
          {[0, 1].map((col) => (
            <div key={col} className={`auth-col ${col ? 'rev' : ''}`}>
              {[...APPS, ...APPS].map((a, i) => (
                <div key={`${a.slug}-${i}`} className="auth-tile">
                  <AppArt app={a} height={120} />
                  <div className="auth-tile-body">
                    <b>{a.name}</b>
                    <span className="mono">${a.price.monthly}/mo · {a.buildHours}h build</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="auth-quote">
          <span className="serif">“Everyone teaches you to launch. This teaches you to get paid.”</span>
          <span className="label">Idea → Build → Sell</span>
        </div>
      </div>
    </div>
  )
}
