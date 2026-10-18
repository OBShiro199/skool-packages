import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useUser } from './lib/store'
import { Toasts } from './components/Toasts'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import Shell from './components/Shell'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import AppDetailPage from './pages/AppDetailPage'
import BuildPage from './pages/BuildPage'
import DocsPage from './pages/DocsPage'
import SupportPage from './pages/SupportPage'
import AboutPage from './pages/AboutPage'
import LandingPreviewPage from './pages/LandingPreviewPage'

function RequireAuth({ children, onboarded = true }: { children: ReactNode; onboarded?: boolean }) {
  const user = useUser()
  if (!user) return <Navigate to="/auth" replace />
  if (onboarded && !user.onboarding) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function Root() {
  const user = useUser()
  if (!user) return <Navigate to="/auth" replace />
  if (!user.onboarding) return <Navigate to="/onboarding" replace />
  return <Navigate to="/app" replace />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<RequireAuth onboarded={false}><OnboardingPage /></RequireAuth>} />
        <Route path="/app" element={<RequireAuth><Shell /></RequireAuth>}>
          <Route index element={<HomePage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="library/:slug" element={<AppDetailPage />} />
          <Route path="build/:slug" element={<BuildPage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
        <Route path="/landing/:slug" element={<LandingPreviewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </>
  )
}
