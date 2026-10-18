import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { EASE, TrialButton, Wordmark, scrollToId } from './shared'
import { Hero } from './Hero'
import { Demo } from './Demo'
import { Features } from './Features'
import { Compare, FAQ, Faq, FinalCta, Footer, HowItWorks, LogoStrip, Pricing, Problem, Testimonials } from './Sections'
import './styles.css'

const LINKS: [string, string][] = [['How it works', 'how'], ['Features', 'features'], ['For teams', 'teams'], ['Pricing', 'pricing'], ['Compare', 'compare'], ['FAQ', 'faq']]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Sparring', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Solo', price: '49', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Team', price: '199', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Floor', price: '499', priceCurrency: 'USD' },
    ],
  },
  {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
])

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
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const go = (id: string) => { setOpen(false); scrollToId(id) }
  return (
    <motion.nav className={`sp-nav ${scrolled || open ? 'is-scrolled' : ''}`} aria-label="Main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="sp-nav-inner">
        <a href="#top" className="sp-nav-brand" aria-label="Sparring home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Wordmark /></a>
        <ul className="sp-nav-links">
          {LINKS.map(([l, id]) => <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
        </ul>
        <div className="sp-nav-right">
          <a href="/login" className="sp-btn sp-btn-md sp-btn-ghost sp-nav-login" onClick={(e) => e.preventDefault()}>Log in</a>
          <span className="sp-nav-cta"><TrialButton location="nav" size="md" /></span>
          <span className="sp-nav-cta-sm"><TrialButton location="nav" size="sm" /></span>
          <button type="button" className="sp-burger" aria-expanded={open} aria-controls="sp-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="sp-sheet" className="sp-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EASE }}>
            <ul>
              {LINKS.map(([l, id]) => <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
              <li><a href="/login" onClick={(e) => { e.preventDefault(); setOpen(false) }}>Log in</a></li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

export default function SparringLanding() {
  const [sampleKey, setSampleKey] = useState(0)
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600&family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Sparring: AI cold call practice with instant scoring'
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prevDesc = meta?.content
    if (meta) meta.content = 'Practise cold calls with realistic AI prospects who push back. Get a score out of 100 and coaching notes on the exact second. Built for SDR teams and founders. 7 day free trial.'
    return () => { link.remove(); document.title = prevTitle; if (meta && prevDesc !== undefined) meta.content = prevDesc }
  }, [])

  return (
    <div className="lp-sparring">
      <a href="#main" className="sp-skip">Skip to content</a>
      <Nav />
      <div className="sp-rail">
        <Hero onSample={() => setSampleKey((k) => k + 1)} />
        <main id="main">
          <LogoStrip />
          <Problem />
          <Demo startKey={sampleKey} />
          <Features />
          <HowItWorks />
          <Compare />
          <Testimonials />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
    </div>
  )
}
