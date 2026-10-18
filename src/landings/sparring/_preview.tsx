import { createRoot } from 'react-dom/client'
import '../../styles/global.css'
import '../../styles/pages.css'
import Landing from './index'

createRoot(document.getElementById('root')!).render(
  <>
    <Landing />
    <a className="lp-back" href="#">Back to the Sparring kit</a>
  </>,
)
