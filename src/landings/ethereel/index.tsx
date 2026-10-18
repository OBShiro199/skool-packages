import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { EASE, TrialBtn, Wordmark, scrollToId } from './shared'
import { Hero, LogoStrip, Problem } from './Hero'
import { Demo } from './Demo'
import { Features } from './Features'
import { Compare, FAQ, Faq, FinalCta, Footer, HowItWorks, Pricing, Testimonials } from './Bottom'
import './styles.css'

const LINKS: [string, string][] = [['How it works', 'how'], ['Features', 'features'], ['Pricing', 'pricing'], ['FAQ', 'faq']]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Ethereel', applicationCategory: 'MultimediaApplication',
    offers: [
      { '@type': 'Offer', name: 'Creator', price: '89', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Pro', price: '199', priceCurrency: 'USD' },
    ],
  },
  {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
])

/** Sticky 56px nav with a bottom hairline. Never hides on scroll. Mobile: a full-width sheet. */
function Nav() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const go = (id: string) => { setOpen(false); scrollToId(id) }
  return (
    <header className="er-nav">
      <div className="er-rail er-nav-inner">
        <a href="#top" className="er-nav-brand" aria-label="Ethereel home" onClick={(e) => { e.preventDefault(); go('top') }}><Wordmark /></a>
        <nav aria-label="Main">
          <ul className="er-nav-links">
            {LINKS.map(([l, id]) => <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
          </ul>
        </nav>
        <div className="er-nav-right">
          <a href="/login" className="er-nav-login" onClick={(e) => e.preventDefault()}>Log in</a>
          <TrialBtn location="nav" size="sm" />
          <button
            type="button" className="er-burger" aria-expanded={open} aria-controls="er-sheet"
            aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            id="er-sheet" className="er-sheet"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <ul>
              {LINKS.map(([l, id]) => <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
              <li><a href="/login" onClick={(e) => e.preventDefault()}>Log in</a></li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default function EthereelLanding() {
  useEffect(() => {
    // Inter Tight stands in for the reel's Inter SemiBold captions (allowed font list).
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600&family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Ethereel: raw talking-head clips to edited, scheduled reels'
    const meta = document.createElement('meta')
    meta.name = 'description'
    meta.content = 'Upload a raw clip. Ethereel cuts the pauses, adds captions, zooms, hand-drawn diagrams and music, then posts to TikTok and Instagram at your best times after you approve it.'
    document.head.appendChild(meta)
    return () => { link.remove(); meta.remove(); document.title = prevTitle }
  }, [])

  return (
    <div className="lp-ethereel" lang="en-GB">
      <a href="#main" className="er-skip">Skip to content</a>
      <Nav />
      <main id="main">
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
      <div className="er-grain" aria-hidden="true" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
    </div>
  )
}
