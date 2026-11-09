import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useUser } from './lib/store'
import { Toasts } from './components/Toasts'
import AuthPage from './pages/AuthPage'
import Shell from './components/Shell'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import AppDetailPage from './pages/AppDetailPage'
import BuildPage from './pages/BuildPage'
import DocsPage from './pages/DocsPage'
import SupportPage from './pages/SupportPage'
import AboutPage from './pages/AboutPage'
import LandingPreviewPage from './pages/LandingPreviewPage'
import LeadsPage from './leads/LeadsPage'
import DesignsPage from './designs/DesignsPage'
import DesignDetailPage from './designs/DesignDetailPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useUser()
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function Root() {
  const user = useUser()
  return <Navigate to={user ? '/app' : '/auth'} replace />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<Navigate to="/app" replace />} />
        <Route path="/app" element={<RequireAuth><Shell /></RequireAuth>}>
          <Route index element={<HomePage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="designs" element={<DesignsPage />} />
          <Route path="designs/:slug" element={<DesignDetailPage />} />
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
