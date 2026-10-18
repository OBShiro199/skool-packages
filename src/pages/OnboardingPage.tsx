import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useStore, useUser } from '../lib/store'
import { APPS, getApp } from '../content/apps'
import { AppArt } from '../components/AppArt'
import { Bar } from '../components/Ring'
import { KitLogo } from '../components/KitLogo'
import { celebrate } from '../lib/confetti'

interface Q { id: string; title: string; sub: string; options: { v: string; label: string; hint: string }[] }

const QUESTIONS: Q[] = [
  {
    id: 'background', title: 'What have you done for work before?', sub: 'We match you to an app where your experience is an unfair advantage when selling it.',
    options: [
      { v: 'sales', label: 'Sales or business development', hint: 'SDR, AE, recruiter, closer' },
      { v: 'content', label: 'Content, social or marketing', hint: 'Creator, editor, social manager' },
      { v: 'agency', label: 'Agency or freelance', hint: 'You serve clients' },
      { v: 'ops', label: 'Operations, admin or finance', hint: 'You run the systems' },
      { v: 'local', label: 'Ran a local business', hint: 'Salon, gym, trades, tutoring' },
      { v: 'other', label: 'Something else', hint: 'Student, corporate, career switch' },
    ],
  },
  {
    id: 'enjoy', title: 'Which of these would you happily do for an hour a day?', sub: 'You will spend more time selling than building. Pick the one you would not dread.',
    options: [
      { v: 'post', label: 'Post content', hint: 'Short videos, LinkedIn posts, YouTube' },
      { v: 'talk', label: 'Message and call strangers', hint: 'Cold email, DMs, calls' },
      { v: 'systems', label: 'Build systems and automations', hint: 'Spreadsheets, Zapier, workflows' },
      { v: 'ai', label: 'Play with AI tools', hint: 'Prompts, agents, new models' },
    ],
  },
  {
    id: 'hours', title: 'How many hours a week can you give this?', sub: 'Be honest. We size the plan to it.',
    options: [
      { v: '5', label: 'Under 5 hours', hint: 'Evenings only' },
      { v: '10', label: '5 to 10 hours', hint: 'A few evenings and a weekend morning' },
      { v: '20', label: '10 to 20 hours', hint: 'Serious side project' },
      { v: '40', label: '20+ hours', hint: 'This is the main thing' },
    ],
  },
  {
    id: 'claude', title: 'Have you used Claude Code before?', sub: 'Every kit starts from a blank folder either way. This changes how much we explain.',
    options: [
      { v: 'never', label: 'Never opened a terminal', hint: 'We start from zero' },
      { v: 'some', label: 'Tried it a few times', hint: 'Built something small' },
      { v: 'daily', label: 'I use it every day', hint: 'Skip the basics' },
    ],
  },
  {
    id: 'goal', title: 'What MRR do you want 12 months from now?', sub: 'Monthly recurring revenue. We use it to set your weekly outreach targets.',
    options: [
      { v: '1000', label: '$1,000 / month', hint: 'About 25 customers at $39' },
      { v: '5000', label: '$5,000 / month', hint: 'About 65 customers at $79' },
      { v: '10000', label: '$10,000 / month', hint: 'The community target' },
      { v: '25000', label: '$25,000+ / month', hint: 'Quit-the-job money' },
    ],
  },
]

function recommend(a: Record<string, string>): string {
  const byBackground: Record<string, string> = { sales: 'etcher', content: 'ethereel', ops: 'etcher', local: 'bookwell', agency: 'factorie' }
  const byEnjoy: Record<string, string> = { post: 'ethereel', talk: 'outbounder', systems: 'etcher', ai: 'factorie' }
  for (const slug of [byBackground[a.background], byEnjoy[a.enjoy]]) if (getApp(slug)) return slug
  return APPS[Math.floor(Math.random() * APPS.length)].slug
}

const MATCH_STEPS = ['Reading your answers', 'Scoring 20 kits against your background', 'Checking build time against your hours', 'Picking the one you can sell fastest']

export default function OnboardingPage() {
  const user = useUser()!
  const complete = useStore((s) => s.completeOnboarding)
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<'intro' | 'q' | 'matching' | 'result'>('intro')
  const [matchStep, setMatchStep] = useState(0)
  const [recSlug, setRecSlug] = useState<string>()
  const rec = getApp(recSlug)

  useEffect(() => {
    if (phase !== 'matching') return
    setMatchStep(0)
    const ids = MATCH_STEPS.map((_, i) => setTimeout(() => setMatchStep(i + 1), 600 * (i + 1)))
    const done = setTimeout(() => { setPhase('result'); celebrate() }, 600 * MATCH_STEPS.length + 500)
    return () => { ids.forEach(clearTimeout); clearTimeout(done) }
  }, [phase])

  const q = QUESTIONS[step]
  const pick = (v: string) => {
    const next = { ...answers, [q.id]: v }
    setAnswers(next)
    setTimeout(() => {
      if (step + 1 < QUESTIONS.length) setStep(step + 1)
      else { setRecSlug(recommend(next)); setPhase('matching') }
    }, 260)
  }

  const finish = (to: string) => {
    if (rec) complete(answers, rec.slug)
    nav(to, { replace: true })
  }

  return (
    <div className="onb">
      <header className="onb-top">
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-mark">BPA</div>
          <div><b>BPA Vault</b><small>Onboarding</small></div>
        </div>
        {phase === 'q' && (
          <div className="onb-progress">
            <span className="label">Question {step + 1} of {QUESTIONS.length}</span>
            <Bar pct={(step + (answers[q.id] ? 1 : 0)) / QUESTIONS.length} />
          </div>
        )}
      </header>

      <main className="onb-main">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.section key="intro" className="onb-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <span className="label">Welcome, {user.profile.name}</span>
              <h1 className="onb-h1">Five questions. Then we hand you the app you should build.</h1>
              <p className="muted onb-sub">Each kit in the vault is a SaaS that people already pay for. Your answers decide which one fits your skills, your hours and the channel you will sell through.</p>
              <div className="onb-steps">
                {['Answer 5 questions', 'Get matched to a kit', 'Sign your commitment', 'Build it step by step'].map((s, i) => (
                  <div key={s} className="onb-step"><span className="mono">0{i + 1}</span>{s}</div>
                ))}
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => setPhase('q')}>Start <ArrowRight size={16} /></button>
            </motion.section>
          )}

          {phase === 'q' && (
            <motion.section key={`q${step}`} className="onb-card" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.1, 1] }}>
              <span className="label">0{step + 1}</span>
              <h1 className="onb-h1">{q.title}</h1>
              <p className="muted onb-sub">{q.sub}</p>
              <div className={`onb-options ${q.options.length > 4 ? 'two' : ''}`}>
                {q.options.map((o, i) => {
                  const on = answers[q.id] === o.v
                  return (
                    <motion.button key={o.v} className={`onb-opt ${on ? 'on' : ''}`} onClick={() => pick(o.v)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <span className="onb-key mono">{String.fromCharCode(65 + i)}</span>
                      <span style={{ flex: 1 }}><b>{o.label}</b><small>{o.hint}</small></span>
                      {on && <Check size={18} />}
                    </motion.button>
                  )
                })}
              </div>
              {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button>}
            </motion.section>
          )}

          {phase === 'matching' && (
            <motion.section key="matching" className="onb-card center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="matcher">
                {APPS.map((a, i) => (
                  <motion.div key={a.slug} className="matcher-tile" animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}>
                    <AppArt app={a} height={60} />
                  </motion.div>
                ))}
              </div>
              <h1 className="onb-h1" style={{ fontSize: 28 }}>Matching you to a kit</h1>
              <div className="match-list">
                {MATCH_STEPS.map((s, i) => (
                  <div key={s} className={`match-row ${matchStep > i ? 'done' : matchStep === i ? 'cur' : ''}`}>
                    <span className="tick-sm">{matchStep > i ? <Check size={12} /> : null}</span>{s}
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {phase === 'result' && rec && (
            <motion.section key="result" className="onb-card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <span className="label" style={{ color: 'var(--money)' }}>Your match</span>
              <h1 className="onb-h1">Build <span className="hl">{rec.name}</span>.</h1>
              <div className="rec-card">
                <div className="rec-body">
                  <div className="row between wrap">
                    <b className="kit-name" style={{ fontSize: 18 }}><KitLogo app={rec} size={20} />{rec.name}</b>
                    <span className="chip chip-money">${rec.price.monthly}/mo · {rec.price.trialDays}-day trial</span>
                  </div>
                  <p className="muted">{rec.oneLiner}</p>
                  <p style={{ fontSize: 14 }}><b>Why you:</b> {rec.idealFor}</p>
                  <p style={{ fontSize: 14 }}><b>Why it sells:</b> {rec.whyItSells}</p>
                  <div className="row wrap" style={{ gap: 6 }}>
                    {rec.apis.map((a) => <span key={a.name} className="chip">{a.name}</span>)}
                  </div>
                </div>
              </div>
              <div className="row wrap" style={{ gap: 10 }}>
                <button className="btn btn-primary btn-lg" onClick={() => finish(`/app/library/${rec.slug}`)}>See the {rec.name} kit <ArrowRight size={16} /></button>
                <button className="btn btn-lg" onClick={() => finish('/app/library')}>Browse every kit</button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
