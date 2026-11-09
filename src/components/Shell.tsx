import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, Copy, Flame, Home, LifeBuoy, LogOut, Menu, Palette, Search, UserRound } from 'lucide-react'
import { api } from '../leads/api'
import { cloudEnabled, onSyncState, setUnauthorizedHandler } from '../lib/cloud'
import { handle, streak, useStore, useUser } from '../lib/store'
import { getApp } from '../content/apps'
import { appStats, levelFor } from '../lib/progress'
import { Bar, Ring } from './Ring'
import { AskOlly } from './AskOlly'
import { KitLogo } from './KitLogo'
import { BackToSkool, BrandMark, PoweredBySkool } from './Brand'

export function useTotals() {
  const user = useUser()!
  let xp = 0
  const builds = Object.keys(user.commitments)
    .map((slug) => getApp(slug))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((app) => {
      const s = appStats(app, user.progress[app.slug]?.checked ?? {})
      xp += s.xp
      return { app, s }
    })
  return { xp, builds, level: levelFor(xp), streak: streak(user.activeDays) }
}

export default function Shell() {
  const user = useUser()!
  const signOut = useStore((s) => s.signOut)
  const { xp, builds, level, streak: days } = useTotals()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])
  const hydrate = useStore((s) => s.hydrate)
  const [sync, setSync] = useState({ pending: 0, failing: false })
  // The account on the server is the truth: load it on every visit, and sign out here if the session has ended.
  useEffect(() => {
    if (!cloudEnabled) return
    setUnauthorizedHandler(signOut)
    api.me().then(hydrate).catch((e) => (e?.status === 401 || e?.status === 403) && signOut())
    const off = onSyncState(setSync)
    return () => { off() }
  }, [signOut, hydrate])

  return (
    <div className="shell">
      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <BrandMark />
          <div><b>BPA Vault</b><small>{handle(user.profile)}</small></div>
        </div>

        <NavLink to="/app/library" data-tour="clone" className={({ isActive }) => `nav-link cta ${isActive ? 'active' : ''}`}><Copy size={16} /> Clone a Software App</NavLink>
        <NavLink to="/app" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Home size={16} /> Dashboard</NavLink>
        <NavLink to="/app/leads" data-tour="leads" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Search size={16} /> Find Leads</NavLink>
        <NavLink to="/app/designs" data-tour="designs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Palette size={16} /> Designs</NavLink>

        <div data-tour="builds">
        <div className="nav-group label">Your builds</div>
        {builds.length === 0 && <p className="muted" style={{ fontSize: 13, padding: '0 10px' }}>No builds yet. Pick a kit to start.</p>}
        {builds.map(({ app, s }) => (
          <NavLink key={app.slug} to={`/app/build/${app.slug}`} className={({ isActive }) => `nav-link build-link ${isActive ? 'active' : ''}`}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="kit-name"><KitLogo app={app} size={16} /><span className="kit-name-text">{app.name}</span></span>
              <Bar pct={s.pct} />
            </span>
            <span className="count">{Math.round(s.pct * 100)}%</span>
          </NavLink>
        ))}
        </div>

        <div data-tour="help">
        <div className="nav-group label">Help</div>
        <NavLink to="/app/docs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><BookOpen size={16} /> Documentation</NavLink>
        <NavLink to="/app/support" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><LifeBuoy size={16} /> Support</NavLink>
        <NavLink to="/app/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><UserRound size={16} /> About You</NavLink>
        </div>

        <div className="side-foot">
          <BackToSkool />
          <div className="side-card" data-tour="xp">
            <div className="row">
              <Ring pct={level.pct} size={40} stroke={4}><span className="mono" style={{ fontSize: 11 }}>L{level.index + 1}</span></Ring>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 14 }}>{level.name}</b>
                <div className="mono muted" style={{ fontSize: 11.5 }}>{xp} XP{level.next ? ` · ${level.ceil - xp} to ${level.next}` : ''}</div>
              </div>
            </div>
            <div className="row" style={{ fontSize: 13 }}>
              <Flame size={15} color={days ? 'var(--amber)' : 'var(--muted)'} />
              <span><b className="mono">{days}</b> day streak</span>
            </div>
          </div>
          <div className="row">
            <span style={{ flex: 1 }} />
            <button className="btn btn-sm btn-ghost" onClick={() => { if (!import.meta.env.VITE_HASH_ROUTER) api.logout().catch(() => {}); signOut() }}><LogOut size={15} /> Sign out</button>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="btn btn-sm btn-ghost mobile-nav-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <span className="label">Build $10K p/m Profitable Apps</span>
          <span className="grow" />
          {sync.pending > 0 && <span className={`chip sync-chip ${sync.failing ? 'warn' : ''}`} role="status">{sync.failing ? 'Offline: will save when back' : 'Saving…'}</span>}
          <span className="chip"><Flame size={12} /> {days}d</span>
          <span className="chip chip-signal">{xp} XP · {level.name}</span>
          <PoweredBySkool />
        </div>
        <Outlet />
      </div>
      <AskOlly />
    </div>
  )
}
