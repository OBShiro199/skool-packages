import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { localDay, push } from './cloud'

// The member's account lives on the server (Supabase, via /api/vault/*). This store is the on-screen copy:
// `hydrate` fills it from /api/vault/me after sign-in, and every change is applied here immediately and
// queued to the server by ./cloud. It is also cached in localStorage so the Vault opens instantly.
// Shareable previews (hash routing, no server) use the local-only signUp/signIn below instead.

export interface Profile {
  /** Skool username, lower case, without the @ (accounts made before usernames hold an email here). */
  username: string
  name: string
  createdAt: string
  email?: string
}

/** Accepts "olly", "@olly" or "skool.com/@olly" and returns "olly". */
export function normUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^(www\.)?skool\.com\//, '').replace(/^@/, '').replace(/[/?#].*$/, '')
}

/** How a member is shown: @username, or the email on older demo accounts. */
export function handle(p: Profile & { email?: string }): string {
  const u = p.username ?? p.email ?? ''
  return u.includes('@') ? u : `@${u}`
}

export interface Commitment {
  signature: string // PNG data URL
  typedName: string
  signedAt: string
}

export interface AppProgress {
  startedAt: string
  checked: Record<string, string> // checklist item id -> ISO time
  lastTab?: string
}

export interface UserData {
  profile: Profile
  password: string
  onboarding?: { answers: Record<string, string>; recommended: string; completedAt: string }
  commitments: Record<string, Commitment>
  progress: Record<string, AppProgress>
  activeDays: string[] // YYYY-MM-DD
  activeApp?: string
  /** Set once the dashboard tour has been finished or skipped. */
  tourDone?: boolean
  savedDesigns?: string[]
}

/** What /api/vault/me returns. */
export interface ServerState {
  profile: { user_id: string; skool_handle: string; email: string; display_name: string; tour_done: boolean; active_app: string | null; created_at: string }
  commitments: Record<string, Commitment>
  progress: Record<string, { startedAt: string; lastTab: string | null; checked: Record<string, string> }>
  activeDays: string[]
  savedDesigns: string[]
}

interface State {
  users: Record<string, UserData>
  session: string | null // username
  signUp: (name: string, username: string, password: string) => { ok: true } | { ok: false; error: string }
  signIn: (username: string, password: string) => { ok: true } | { ok: false; error: string }
  signOut: () => void
  completeOnboarding: (answers: Record<string, string>, recommended: string) => void
  commit: (slug: string, c: Omit<Commitment, 'signedAt'>) => void
  toggleItem: (slug: string, itemId: string, value?: boolean) => void
  setLastTab: (slug: string, tab: string) => void
  setActiveApp: (slug: string) => void
  updateProfile: (p: Partial<Pick<Profile, 'name'>>) => void
  resetApp: (slug: string) => void
  resetOnboarding: () => void
  setTourDone: (done: boolean) => void
  toggleDesign: (slug: string) => void
  /** Replace the on-screen copy with the member's saved account (after sign-in, and on every load). */
  hydrate: (s: ServerState) => void
}

const today = () => localDay()

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const patchUser = (fn: (u: UserData) => UserData) => {
        const key = get().session
        if (!key) return
        const u = get().users[key]
        if (!u) return
        set({ users: { ...get().users, [key]: fn(u) } })
      }
      const touchDay = (u: UserData): UserData =>
        u.activeDays.includes(today()) ? u : { ...u, activeDays: [...u.activeDays, today()] }

      return {
        users: {},
        session: null,

        signUp: (name, username, password) => {
          const key = normUsername(username)
          if (get().users[key]) return { ok: false, error: 'An account with this Skool username already exists. Sign in instead.' }
          const user: UserData = {
            profile: { username: key, name: name.trim(), createdAt: new Date().toISOString() },
            password,
            commitments: {},
            progress: {},
            activeDays: [today()],
          }
          set({ users: { ...get().users, [key]: user }, session: key })
          return { ok: true }
        },

        signIn: (username, password) => {
          const key = normUsername(username)
          const u = get().users[key]
          if (!u) {
            // Demo: the first sign-in with a username creates that member's account. With a backend,
            // the account and the DM'd password would already exist.
            const user: UserData = {
              profile: { username: key, name: key, createdAt: new Date().toISOString() },
              password,
              commitments: {},
              progress: {},
              activeDays: [today()],
            }
            set({ users: { ...get().users, [key]: user }, session: key })
            return { ok: true }
          }
          // The server has already checked the shared password; keep this copy in step when it changes.
          set({ session: key, users: { ...get().users, [key]: touchDay({ ...u, password }) } })
          return { ok: true }
        },

        signOut: () => set({ session: null }),

        hydrate: (st) => {
          const key = st.profile.skool_handle
          const user: UserData = {
            profile: { username: key, name: st.profile.display_name, createdAt: st.profile.created_at, email: st.profile.email },
            password: '',
            commitments: st.commitments ?? {},
            progress: Object.fromEntries(Object.entries(st.progress ?? {}).map(([k, v]) => [k, { startedAt: v.startedAt, checked: v.checked ?? {}, lastTab: v.lastTab ?? undefined }])),
            activeDays: st.activeDays ?? [],
            activeApp: st.profile.active_app ?? undefined,
            tourDone: st.profile.tour_done,
            savedDesigns: st.savedDesigns ?? [],
          }
          // only this member's data is kept in the browser
          set({ users: { [key]: user }, session: key })
        },

        toggleDesign: (slug) =>
          patchUser((u) => {
            const saved = u.savedDesigns ?? []
            const on = !saved.includes(slug)
            push({ op: 'design', slug, saved: on })
            return { ...u, savedDesigns: on ? [slug, ...saved] : saved.filter((x) => x !== slug) }
          }),

        completeOnboarding: (answers, recommended) =>
          patchUser((u) => ({ ...u, onboarding: { answers, recommended, completedAt: new Date().toISOString() } })),

        commit: (slug, c) =>
          patchUser((u) => (push({ op: 'commit', app: slug, typedName: c.typedName, signature: c.signature }), {
            ...u,
            activeApp: slug,
            commitments: { ...u.commitments, [slug]: { ...c, signedAt: new Date().toISOString() } },
            progress: u.progress[slug] ? u.progress : { ...u.progress, [slug]: { startedAt: new Date().toISOString(), checked: {} } },
          })),

        toggleItem: (slug, itemId, value) =>
          patchUser((u) => {
            const p = u.progress[slug] ?? { startedAt: new Date().toISOString(), checked: {} }
            const isOn = !!p.checked[itemId]
            const next = value ?? !isOn
            if (next === isOn) return u
            push({ op: 'tick', app: slug, item: itemId, on: next, day: today() })
            const checked = { ...p.checked }
            if (next) checked[itemId] = new Date().toISOString()
            else delete checked[itemId]
            return touchDay({ ...u, progress: { ...u.progress, [slug]: { ...p, checked } } })
          }),

        setLastTab: (slug, tab) =>
          patchUser((u) => {
            const p = u.progress[slug]
            if (!p || p.lastTab === tab) return u
            push({ op: 'tab', app: slug, tab })
            return { ...u, progress: { ...u.progress, [slug]: { ...p, lastTab: tab } } }
          }),

        setActiveApp: (slug) => patchUser((u) => { if (u.activeApp !== slug) push({ op: 'active', app: slug }); return { ...u, activeApp: slug } }),

        updateProfile: (p) => patchUser((u) => { if (p.name) push({ op: 'profile', name: p.name }); return { ...u, profile: { ...u.profile, ...p } } }),

        resetApp: (slug) =>
          patchUser((u) => (push({ op: 'reset', app: slug }), { ...u, progress: { ...u.progress, [slug]: { startedAt: new Date().toISOString(), checked: {} } } })),

        resetOnboarding: () => patchUser((u) => ({ ...u, onboarding: undefined })),

        setTourDone: (done) => patchUser((u) => { if (!!u.tourDone !== done) push({ op: 'tour', done }); return { ...u, tourDone: done } }),
      }
    },
    { name: 'bpa-vault-v1' },
  ),
)

export function useUser(): UserData | null {
  return useStore((s) => (s.session ? s.users[s.session] ?? null : null))
}

/** Consecutive active days ending today or yesterday. */
export function streak(days: string[]): number {
  const set = new Set(days)
  const d = new Date()
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(d.toISOString().slice(0, 10))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
