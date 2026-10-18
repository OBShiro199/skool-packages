import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { EASE, TrialButton, Wordmark, scrollToId, track } from './shared'
import { Hero, LogoStrip } from './Hero'
import { Features } from './Bento'
import { Compare, Demo, DemoDialog, FAQ, Faq, FinalCta, Footer, HowItWorks, Pricing, Problem } from './Sections'
import './styles.css'

const LINKS: [string, string][] = [['Features', 'features'], ['How it works', 'how'], ['Pricing', 'pricing'], ['Compare', 'compare'], ['Help', 'faq']]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Rota', applicationCategory: 'BusinessApplication', operatingSystem: 'Web',
    offers: [
      { '@type': 'Offer', name: 'Starter', price: '39', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Team', price: '69', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Pro', price: '149', priceCurrency: 'USD' },
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
  const go = (id: string, item: string) => { setOpen(false); track('lp_nav_click', { item }); scrollToId(id) }
  return (
    <nav className={`rt-nav ${scrolled || open ? 'is-scrolled' : ''}`} aria-label="Main">
      <div className="rt-nav-inner">
        <a href="#top" className="rt-nav-brand" aria-label="Rota home" onClick={(e) => { e.preventDefault(); setOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Wordmark /></a>
        <ul className="rt-nav-links">
          {LINKS.map(([l, id]) => <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id, l) }}>{l}</a></li>)}
        </ul>
        <div className="rt-nav-right">
          <a href="#top" className="rt-login" onClick={(e) => e.preventDefault()}>Log in</a>
          <TrialButton location="nav" size="sm" />
          <button type="button" className="rt-burger" aria-expanded={open} aria-controls="rt-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="rt-sheet" className="rt-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EASE }}>
            <ul>
              {LINKS.map(([l, id]) => <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id, l) }}>{l}</a></li>)}
              <li><a href="#top" onClick={(e) => { e.preventDefault(); setOpen(false) }}>Log in</a></li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default function RotaLanding() {
  const [demo, setDemo] = useState(false)
  const openDemo = useCallback(() => { setDemo(true); track('lp_demo_opened', { location: 'hero' }) }, [])
  const closeDemo = useCallback(() => setDemo(false), [])
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Rota: staff rota software with AI drafts and shift texts'
    const meta = document.createElement('meta')
    meta.name = 'description'
    meta.content = "Build next week's staff rota in minutes. Claude drafts it from availability, Rota catches clashes and texts every person their shifts. Swaps, clock-in, CSV for payroll. From $39 a location."
    document.head.appendChild(meta)
    track('lp_view', { referrer: document.referrer })
    return () => { link.remove(); meta.remove(); document.title = prevTitle }
  }, [])

  return (
    <div className="lp-rota">
      <a href="#main" className="rt-skip">Skip to content</a>
      <Nav />
      <div className="rt-rail">
        <Hero onDemo={openDemo} />
        <main id="main">
          <LogoStrip />
          <Problem />
          <Demo />
          <Features />
          <HowItWorks />
          <Compare />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
      <DemoDialog open={demo} onClose={closeDemo} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
    </div>
  )
}
