import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import './styles/global.css'
import './styles/components.css'
import './styles/pages.css'
import './styles/quiet.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.VITE_HASH_ROUTER ? (
      <HashRouter><App /></HashRouter>
    ) : (
      <BrowserRouter><App /></BrowserRouter>
    )}
  </StrictMode>,
)
