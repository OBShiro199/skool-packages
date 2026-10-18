import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { EASE, TrialButton, Wordmark, scrollToId, track } from './shared'
import { Hero } from './Hero'
import { Demo } from './Demo'
import { Features } from './Features'
import { Compare, FAQ, Faq, FinalCta, Footer, HowItWorks, LogoStrip, Pricing, Problem, Testimonials } from './Sections'
import './styles.css'

const LINKS: [string, string][] = [['How it works', 'how'], ['Testing', 'testing'], ['Pricing', 'pricing'], ['FAQ', 'faq']]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Marquee', applicationCategory: 'MultimediaApplication',
    offers: [
      { '@type': 'Offer', name: 'Creator', price: '29', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Pro', price: '59', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Agency', price: '149', priceCurrency: 'USD' },
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
    <nav className={`mq-nav ${scrolled || open ? 'is-scrolled' : ''}`} aria-label="Main">
      <div className="mq-nav-inner">
        <a href="#top" className="mq-nav-brand" aria-label="Marquee home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Wordmark /></a>
        <ul className="mq-nav-links">
          {LINKS.map(([l, id]) => <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
        </ul>
        <div className="mq-nav-right">
          <a href="/login" className="mq-nav-login" onClick={(e) => e.preventDefault()}>Log in</a>
          <span className="mq-nav-cta"><TrialButton location="nav" size="md" /></span>
          <span className="mq-nav-cta-sm"><TrialButton location="nav" size="sm" /></span>
          <button type="button" className="mq-burger" aria-expanded={open} aria-controls="mq-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="mq-sheet" className="mq-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EASE }}>
            <ul>
              {LINKS.map(([l, id]) => <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
              <li><a href="/login" onClick={(e) => { e.preventDefault(); setOpen(false) }}>Log in</a></li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default function MarqueeLanding() {
  const [demoKey, setDemoKey] = useState(0)
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Marquee: YouTube thumbnails with your face, A/B tested on real views'
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prevDesc = meta?.content
    if (meta) meta.content = 'Type a title, get six thumbnail ideas with your real face cut out, edit them, then A/B test them on your live YouTube video. 7 days free.'
    track('landing_viewed', { referrer: document.referrer })
    return () => { link.remove(); document.title = prevTitle; if (meta && prevDesc !== undefined) meta.content = prevDesc }
  }, [])

  return (
    <div className="lp-marquee" lang="en-GB">
      <a href="#main" className="mq-skip">Skip to content</a>
      <Nav />
      <div className="mq-rail">
        <Hero onDemo={() => setDemoKey((k) => k + 1)} />
        <main id="main">
          <LogoStrip />
          <Problem />
          <Demo startKey={demoKey} />
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
