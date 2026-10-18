import { Suspense, useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { LANDINGS } from '../landings'
import { getApp } from '../content/apps'

/** Full-screen example landing page for a kit's brand, outside the vault shell. */
export default function LandingPreviewPage() {
  const { slug = '' } = useParams()
  const app = getApp(slug)
  const Landing = LANDINGS[slug]
  useEffect(() => { window.scrollTo(0, 0) }, [slug])
  if (!app || !Landing) return <Navigate to="/app/library" replace />
  return (
    <>
      <Suspense fallback={<div style={{ padding: 40, fontFamily: 'Geist, sans-serif' }}>Loading {app.name}…</div>}>
        <Landing />
      </Suspense>
      <Link to={`/app/build/${slug}?tab=downloads`} className="lp-back">
        <ArrowLeft size={14} /> Back to the {app.name} kit
      </Link>
    </>
  )
}
