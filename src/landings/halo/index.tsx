import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { Btn, EASE, Wordmark, scrollToId, track } from './shared'
import { Hero } from './Hero'
import { Demo, LogoStrip, Problem } from './Intro'
import { Features } from './Features'
import { Compare, FAQ, Faq, FinalCta, Footer, HowItWorks, Pricing, Testimonials } from './Bottom'
import './styles.css'

const LINKS: [string, string][] = [['How it works', 'how'], ['Features', 'features'], ['Pricing', 'pricing'], ['Compare', 'compare'], ['FAQ', 'faq']]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Halo', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Solo', price: '49', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Growth', price: '99', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Agency', price: '299', priceCurrency: 'USD' },
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
  const trial = () => { track('lp_cta_click', { location: 'nav' }); go('pricing') }
  return (
    <>
      <nav className={`hl-nav${scrolled ? ' scrolled' : ''}`} aria-label="Main">
        <div className="hl-rail hl-nav-inner">
          <a href="#top" className="hl-nav-brand" aria-label="Halo home" onClick={(e) => { e.preventDefault(); go('top') }}><Wordmark /></a>
          <ul className="hl-nav-links">
            {LINKS.map(([l, id]) => <li key={l}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
          </ul>
          <div className="hl-nav-right">
            <a href="/login" className="hl-btn hl-btn-secondary hl-btn-md hl-nav-login">Log in</a>
            <Btn size="md" href="/signup" onClick={trial}>Start free trial</Btn>
            <button type="button" className="hl-burger" aria-expanded={open} aria-controls="hl-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            id="hl-sheet" className="hl-sheet"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <ul>
              {LINKS.map(([l, id]) => <li key={l}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
              <li><a href="/login">Log in</a></li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function HaloLanding() {
  useEffect(() => {
    const id = 'lp-halo-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
  }, [])
  useEffect(() => {
    const prev = document.title
    document.title = 'Halo: Google review requests by text, without review gating'
    return () => { document.title = prev }
  }, [])
  return (
    <div className="lp-halo">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <header><Nav /></header>
      <main>
        <Hero />
        <LogoStrip />
        <Problem />
        <Demo />
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
  )
}
