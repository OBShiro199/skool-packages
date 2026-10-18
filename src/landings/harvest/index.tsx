import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { Btn, EASE, Wordmark, scrollToId, track } from './shared'
import { Hero } from './Hero'
import { Demo, Numbers, Problem } from './Intro'
import { Features } from './Features'
import { Compare, FAQ, Faq, FinalCta, Footer, HowItWorks, Pricing, Testimonials } from './Bottom'
import './styles.css'

const LINKS: [string, string][] = [['How it works', 'how'], ['Pricing', 'pricing'], ['Compare', 'compare'], ['Docs', 'faq']]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Harvest', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Solo', price: '59', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Growth', price: '129', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Agency', price: '249', priceCurrency: 'USD' },
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
  const trial = () => { track('signup_started', { from: 'nav' }); go('pricing') }
  return (
    <>
      <nav className={`hv-nav${scrolled ? ' scrolled' : ''}`} aria-label="Main">
        <div className="hv-rail hv-nav-inner">
          <a href="#top" className="hv-nav-brand" aria-label="Harvest home" onClick={(e) => { e.preventDefault(); go('top') }}><Wordmark /></a>
          <ul className="hv-nav-links">
            {LINKS.map(([l, id]) => <li key={l}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
          </ul>
          <div className="hv-nav-right">
            <a href="/login" className="hv-btn hv-btn-ghost hv-btn-md hv-nav-login">Log in</a>
            <Btn size="md" href="#pricing" onClick={trial}>Start free trial</Btn>
            <button type="button" className="hv-burger" aria-expanded={open} aria-controls="hv-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            id="hv-sheet" className="hv-sheet"
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

export default function HarvestLanding() {
  useEffect(() => {
    const id = 'lp-harvest-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
  }, [])
  useEffect(() => {
    const prev = document.title
    document.title = 'Harvest: LinkedIn post engagers into warm leads every day'
    return () => { document.title = prev }
  }, [])
  return (
    <div className="lp-harvest">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <header><Nav /></header>
      <main>
        <Hero />
        <Numbers />
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
