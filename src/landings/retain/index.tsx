import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { Btn, OUT, Wordmark, scrollToId, track } from './shared'
import { Hero } from './Hero'
import { Demo, LogoStrip, Problem } from './Intro'
import { Features, Trust } from './Bento'
import { Compare, FAQ, Faq, FinalCta, Footer, HowItWorks, Pricing, Testimonials } from './Bottom'
import './styles.css'

const LINKS: [string, string][] = [['How it works', 'how'], ['Features', 'features'], ['Pricing', 'pricing'], ['Compare', 'compare'], ['Docs', '/docs']]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Retain', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Starter', price: '49', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Growth', price: '129', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Scale', price: '349', priceCurrency: 'USD' },
    ],
  },
  { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
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
  const links = LINKS.map(([l, id]) => <li key={l}>{id.startsWith('/') ? <a href={id}>{l}</a> : <a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a>}</li>)
  return (
    <>
      <nav className={`rt-nav${scrolled ? ' is-scrolled' : ''}`} aria-label="Main">
        <div className="rt-rail rt-nav-inner">
          <a href="#top" className="rt-nav-brand" aria-label="Retain home" onClick={(e) => { e.preventDefault(); go('top') }}><Wordmark /></a>
          <ul className="rt-nav-links">{links}</ul>
          <div className="rt-nav-right">
            <a href="/login" className="rt-nav-login">Log in</a>
            <Btn size="md" href="/signup" onClick={() => track('signup_started', { from: 'nav' })}>Start free trial</Btn>
            <button type="button" className="rt-burger" aria-expanded={open} aria-controls="rt-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div id="rt-sheet" className="rt-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: OUT }}>
            <ul>{links}<li><a href="/login">Log in</a></li></ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function RetainLanding() {
  useEffect(() => {
    const id = 'lp-retain-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
  }, [])
  useEffect(() => {
    const prev = document.title
    document.title = 'Retain: churn prevention for Stripe SaaS | Save MRR'
    track('landing_view')
    return () => { document.title = prev }
  }, [])
  return (
    <div className="lp-retain">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <header><Nav /></header>
      <main>
        <Hero />
        <LogoStrip />
        <Problem />
        <Demo />
        <Features />
        <Trust />
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
