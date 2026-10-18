import { useEffect } from 'react'
import './styles.css'
import { Demo, Hero, Nav, Problem, TradeStrip } from './top'
import { Features } from './features'
import { Compare, Faq, FAQ, FinalCta, Footer, HowItWorks, Pricing, Testimonials, Toast } from './bottom'

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Bookwell',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: [
      { '@type': 'Offer', name: 'Solo', price: '19', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Studio', price: '39', priceCurrency: 'USD' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
])

export default function BookwellLanding() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Bookwell: booking link with deposits and SMS reminders'
    return () => { link.remove(); document.title = prevTitle }
  }, [])

  return (
    <div className="lp-bookwell">
      <a href="#bw-main" className="bw-skip">Skip to content</a>
      <Nav />
      <main id="bw-main">
        <Hero />
        <TradeStrip />
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
      <Toast />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
    </div>
  )
}
