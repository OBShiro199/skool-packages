import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Mock backend. Everything lives in localStorage, keyed by email, so the
// UI behaves like a real multi-user app until Supabase is wired in.

export interface Profile {
  email: string
  name: string
  createdAt: string
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
}

interface State {
  users: Record<string, UserData>
  session: string | null // email
  signUp: (name: string, email: string, password: string) => { ok: true } | { ok: false; error: string }
  signIn: (email: string, password: string) => { ok: true } | { ok: false; error: string }
  signOut: () => void
  completeOnboarding: (answers: Record<string, string>, recommended: string) => void
  commit: (slug: string, c: Omit<Commitment, 'signedAt'>) => void
  toggleItem: (slug: string, itemId: string, value?: boolean) => void
  setLastTab: (slug: string, tab: string) => void
  setActiveApp: (slug: string) => void
  updateProfile: (p: Partial<Pick<Profile, 'name'>>) => void
  resetApp: (slug: string) => void
  resetOnboarding: () => void
}

const today = () => new Date().toISOString().slice(0, 10)
const norm = (e: string) => e.trim().toLowerCase()

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const patchUser = (fn: (u: UserData) => UserData) => {
        const email = get().session
        if (!email) return
        const u = get().users[email]
        if (!u) return
        set({ users: { ...get().users, [email]: fn(u) } })
      }
      const touchDay = (u: UserData): UserData =>
        u.activeDays.includes(today()) ? u : { ...u, activeDays: [...u.activeDays, today()] }

      return {
        users: {},
        session: null,

        signUp: (name, email, password) => {
          const key = norm(email)
          if (get().users[key]) return { ok: false, error: 'An account with this email already exists. Sign in instead.' }
          const user: UserData = {
            profile: { email: key, name: name.trim(), createdAt: new Date().toISOString() },
            password,
            commitments: {},
            progress: {},
            activeDays: [today()],
          }
          set({ users: { ...get().users, [key]: user }, session: key })
          return { ok: true }
        },

        signIn: (email, password) => {
          const key = norm(email)
          const u = get().users[key]
          if (!u) return { ok: false, error: 'No account found for that email. Create one first.' }
          if (u.password !== password) return { ok: false, error: 'That password does not match.' }
          set({ session: key, users: { ...get().users, [key]: touchDay(u) } })
          return { ok: true }
        },

        signOut: () => set({ session: null }),

        completeOnboarding: (answers, recommended) =>
          patchUser((u) => ({ ...u, onboarding: { answers, recommended, completedAt: new Date().toISOString() } })),

        commit: (slug, c) =>
          patchUser((u) => ({
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
            const checked = { ...p.checked }
            if (next) checked[itemId] = new Date().toISOString()
            else delete checked[itemId]
            return touchDay({ ...u, progress: { ...u.progress, [slug]: { ...p, checked } } })
          }),

        setLastTab: (slug, tab) =>
          patchUser((u) => {
            const p = u.progress[slug]
            if (!p || p.lastTab === tab) return u
            return { ...u, progress: { ...u.progress, [slug]: { ...p, lastTab: tab } } }
          }),

        setActiveApp: (slug) => patchUser((u) => ({ ...u, activeApp: slug })),

        updateProfile: (p) => patchUser((u) => ({ ...u, profile: { ...u.profile, ...p } })),

        resetApp: (slug) =>
          patchUser((u) => ({ ...u, progress: { ...u.progress, [slug]: { startedAt: new Date().toISOString(), checked: {} } } })),

        resetOnboarding: () => patchUser((u) => ({ ...u, onboarding: undefined })),
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
