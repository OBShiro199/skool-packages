import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { AuditButton, EASE, TrialButton, Wordmark, scrollToId } from './shared'
import { Hero, LogoStrip } from './Hero'
import { Demo, Features, Problem } from './Features'
import { Compare, FAQ, Faq, FinalCta, Footer, HowItWorks, Pricing } from './Sections'
import './styles.css'

const LINKS: [string, string][] = [
  ['Product', 'product'], ['How it works', 'how'], ['Compare', 'compare'], ['Pricing', 'pricing'], ['FAQ', 'faq'],
]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Factorie', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Starter', price: '99', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Growth', price: '199', priceCurrency: 'USD' },
    ],
  },
  { '@context': 'https://schema.org', '@type': 'Organization', name: 'Factorie', url: 'https://yourdomain.com/' },
  {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
])

function Sheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    const prev = document.activeElement as HTMLElement | null
    el?.querySelector<HTMLElement>('button, a')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !el) return
      const items = Array.from(el.querySelectorAll<HTMLElement>('a, button'))
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); prev?.focus() }
  }, [onClose])
  const go = (id: string) => { onClose(); window.setTimeout(() => scrollToId(id), 0) }
  return (
    <>
      <motion.div className="fc-overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
      <motion.div ref={ref} className="fc-sheet" role="dialog" aria-modal="true" aria-label="Menu"
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
        transition={{ duration: 0.2, ease: EASE }}>
        <div className="fc-sheet-top">
          <Wordmark />
          <button type="button" className="fc-iconbtn" aria-label="Close menu" onClick={onClose}><X size={18} strokeWidth={1.5} /></button>
        </div>
        <ul className="fc-sheet-links">
          {LINKS.map(([l, id]) => (
            <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
          ))}
          <li><a href="/login" onClick={(e) => { e.preventDefault(); onClose() }}>Log in</a></li>
        </ul>
        <div className="fc-sheet-ctas">
          <TrialButton location="nav" full />
          <AuditButton location="nav" />
        </div>
      </motion.div>
    </>
  )
}

function Nav() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="fc-nav" aria-label="Main">
      <div className="fc-nav-inner">
        <a href="#top" className="fc-nav-brand" aria-label="Factorie home" onClick={(e) => { e.preventDefault(); scrollToId('top') }}><Wordmark /></a>
        <ul className="fc-nav-links">
          {LINKS.map(([l, id]) => (
            <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollToId(id) }}>{l}</a></li>
          ))}
        </ul>
        <div className="fc-nav-right">
          <a href="/login" className="fc-nav-login" onClick={(e) => e.preventDefault()}>Log in</a>
          <TrialButton location="nav" size="sm" />
          <button type="button" className="fc-iconbtn fc-burger" aria-expanded={open} aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <AnimatePresence>{open && <Sheet onClose={() => setOpen(false)} />}</AnimatePresence>
    </nav>
  )
}

export default function FactorieLanding() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Factorie: AI visibility tracker for ChatGPT, Perplexity and Gemini'
    const meta = document.createElement('meta')
    meta.name = 'description'
    meta.content = 'See where ChatGPT, Perplexity, Gemini and Claude recommend your brand, who they name instead, and what to fix. 7-day free trial.'
    document.head.appendChild(meta)
    return () => { link.remove(); meta.remove(); document.title = prevTitle }
  }, [])

  return (
    <div className="lp-factorie">
      <a href="#main" className="fc-skip">Skip to content</a>
      <Nav />
      <div className="fc-rail">
        <Hero />
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
    </div>
  )
}
