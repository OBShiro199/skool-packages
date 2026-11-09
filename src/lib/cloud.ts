// Saves every change a member makes to their account, in order, retrying through blips.
// The store applies changes on screen immediately; this sends them to /api/vault/sync behind it.
// Shareable previews (hash routing, no server) don't sync.

export const cloudEnabled = !import.meta.env.VITE_HASH_ROUTER

export type SyncOp =
  | { op: 'commit'; app: string; typedName: string; signature: string }
  | { op: 'tick'; app: string; item: string; on: boolean; day: string }
  | { op: 'tab'; app: string; tab: string }
  | { op: 'active'; app: string }
  | { op: 'reset'; app: string }
  | { op: 'tour'; done: boolean }
  | { op: 'profile'; name: string }
  | { op: 'design'; slug: string; saved: boolean }

type Listener = (s: { pending: number; failing: boolean }) => void
const queue: SyncOp[] = []
let running = false
let failing = false
let onUnauthorized: () => void = () => {}
const listeners = new Set<Listener>()
const emit = () => listeners.forEach((l) => l({ pending: queue.length, failing }))

export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }
export const onSyncState = (l: Listener) => { listeners.add(l); return () => listeners.delete(l) }
export const localDay = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }

export function push(op: SyncOp) {
  if (!cloudEnabled) return
  // only the latest "last tab" per app matters
  if (op.op === 'tab') { const i = queue.findIndex((q, k) => k > 0 && q.op === 'tab' && q.app === op.app); if (i > 0) queue.splice(i, 1) }
  queue.push(op)
  emit()
  void flush()
}

async function flush() {
  if (running) return
  running = true
  let wait = 1000
  while (queue.length) {
    const batch = queue.slice(0, 20)
    let res: Response | null = null
    try {
      res = await fetch('/api/vault/sync', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ops: batch }) })
    } catch { res = null }
    if (res?.ok || res?.status === 400) {
      // 400 means the change itself was invalid: drop it rather than retry forever
      queue.splice(0, batch.length); failing = false; wait = 1000; emit(); continue
    }
    if (res?.status === 401) { queue.length = 0; running = false; failing = false; emit(); onUnauthorized(); return }
    failing = true; emit()
    await new Promise((r) => setTimeout(r, wait))
    wait = Math.min(wait * 2, 30_000)
  }
  running = false
}

// Warn before closing the tab while changes are still being saved.
if (cloudEnabled && typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => { if (queue.length) { e.preventDefault(); e.returnValue = '' } })
}
