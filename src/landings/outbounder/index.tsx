import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { Btn, EASE, Wordmark, scrollToId, track } from './shared'
import { Hero } from './Hero'
import { Demo, LogoStrip, Problem } from './Intro'
import { Features } from './Features'
import { Calculator, HowItWorks } from './Ramp'
import { Compare, FAQ, Faq, FinalCta, Footer, Pricing, Testimonials } from './Bottom'
import './styles.css'

const LINKS: [string, string][] = [
  ['How it works', 'how'], ['Features', 'features'], ['Pricing', 'pricing'], ['Free tool', 'calculator'], ['Docs', 'faq'],
]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Outbounder', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Starter', price: '79', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Growth', price: '179', priceCurrency: 'USD' },
    ],
  },
  {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
])

function UtmBanner() {
  const [show, setShow] = useState(() => new URLSearchParams(window.location.search).get('utm_source') === 'outbounder')
  if (!show) return null
  return (
    <div className="ob-utm" role="note">
      <span>If one of our emails brought you here: yes, Outbounder wrote that first line. That is the product.</span>
      <button type="button" aria-label="Dismiss" onClick={() => setShow(false)}><X size={14} /></button>
    </div>
  )
}

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])
  const go = (id: string) => { setOpen(false); scrollToId(id) }
  return (
    <nav className={`ob-nav${scrolled ? ' scrolled' : ''}`} aria-label="Main">
      <div className="ob-rail ob-nav-inner">
        <a href="#top" className="ob-nav-brand" aria-label="Outbounder home" onClick={(e) => { e.preventDefault(); go('top') }}><Wordmark /></a>
        <ul className="ob-nav-links">
          {LINKS.map(([l, id]) => (
            <li key={l}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
          ))}
        </ul>
        <div className="ob-nav-right">
          <a href="/login" className="ob-btn ob-btn-ghost ob-btn-sm ob-nav-login">Log in</a>
          <Btn size="sm" onClick={() => go('pricing')}>Start free trial</Btn>
          <button type="button" className="ob-burger" aria-expanded={open} aria-controls="ob-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            id="ob-sheet" className="ob-sheet" role="dialog" aria-label="Menu"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.2, ease: EASE }}
          >
            <ul>
              {LINKS.map(([l, id]) => (
                <li key={l}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
              ))}
              <li><a href="/login">Log in</a></li>
            </ul>
            <Btn full onClick={() => go('pricing')}>Start 7-day free trial</Btn>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

/** Under 768px: a bar rises once the hero buttons leave view, hidden again over pricing and the final CTA. */
function MobileCta() {
  const [heroGone, setHeroGone] = useState(false)
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    const hero = document.getElementById('hero-ctas')
    const blockers = ['pricing', 'final'].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    const seen = new Map<Element, boolean>()
    const io1 = new IntersectionObserver(([e]) => setHeroGone(!e.isIntersecting && e.boundingClientRect.top < 0))
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target, e.isIntersecting))
      setBlocked([...seen.values()].some(Boolean))
    })
    if (hero) io1.observe(hero)
    blockers.forEach((b) => io2.observe(b))
    return () => { io1.disconnect(); io2.disconnect() }
  }, [])
  const show = heroGone && !blocked
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="ob-mcta" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} transition={{ duration: 0.2, ease: EASE }}>
          <span>7 days free</span>
          <Btn size="sm" onClick={() => { track('hero_cta_clicked', { button: 'trial', location: 'sticky' }); scrollToId('pricing') }}>Start trial</Btn>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function OutbounderLanding() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Outbounder: cold email that reads like you wrote it'
    const meta = document.createElement('meta')
    meta.name = 'description'
    meta.content = "Find verified B2B leads, write a personalised first line from each company's website and send from safe inboxes on your own domain. 7-day free trial, from $79/mo."
    document.head.appendChild(meta)
    const q = new URLSearchParams(window.location.search)
    track('landing_viewed', { utm_source: q.get('utm_source'), utm_campaign: q.get('utm_campaign'), from_outbounder_email: q.get('utm_source') === 'outbounder' })
    return () => { link.remove(); meta.remove(); document.title = prevTitle }
  }, [])

  return (
    <div className="lp-outbounder">
      <a href="#main" className="ob-skip">Skip to content</a>
      <UtmBanner />
      <Nav />
      <main id="main">
        <Hero />
        <LogoStrip />
        <Problem />
        <Demo />
        <Features />
        <Calculator />
        <HowItWorks />
        <Compare />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <MobileCta />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
    </div>
  )
}
