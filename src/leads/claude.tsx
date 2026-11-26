import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Dialog } from './dialogs'
import { toast } from '../components/Toasts'

// "Use in Claude": connect the Build Software Solo Leads connector (an MCP server with OAuth) to
// Claude, so members can ask for leads in plain English and download the CSV in the chat.
const PROMPTS = [
  'I want 200 leads from the UK who are plumbers, with mobiles',
  'Find founders of US software companies with 11 to 50 employees',
  'Marketing directors in Germany at companies hiring now',
]

function CopyField({ value }: { value: string }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      setTimeout(() => setDone(false), 1600)
    } catch {
      toast('Copy failed. Select the text and copy it instead.')
    }
  }
  return (
    <div className="ld-claude-url">
      <code>{value}</code>
      <button type="button" className="ld-btn" onClick={copy} aria-label="Copy the connector URL">
        {done ? <Check size={14} /> : <Copy size={14} />} {done ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export function ClaudeDialog({ onClose }: { onClose: () => void }) {
  const url = `${window.location.origin}/api/mcp`
  const [busy, setBusy] = useState(false)
  const disconnect = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/vault/claude', { method: 'DELETE', credentials: 'same-origin' })
      if (!res.ok) throw new Error()
      toast('Claude is disconnected. Connect again any time with the same URL.')
    } catch {
      toast('Could not disconnect. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog title="Use Find Leads in Claude" onClose={onClose} width={560}>
      <div className="ld-dialog-body ld-claude">
        <p className="ld-claude-lede">
          Ask Claude for leads in plain English and download the CSV right in the chat. It searches the same UK, EU and US databases, signs in with your Vault account and uses your monthly exports.
        </p>
        <CopyField value={url} />
        <ol className="ld-claude-steps">
          <li>In Claude, open <b>Settings → Connectors</b> and choose <b>Add custom connector</b>.</li>
          <li>Name it <b>Build Software Solo Leads</b> and paste the URL above.</li>
          <li>Click <b>Connect</b>, sign in with your Vault email and password, and allow access.</li>
          <li>In a chat, switch it on from the connectors menu and ask away.</li>
        </ol>
        <p className="ld-muted" style={{ margin: '2px 0 0' }}>Try asking</p>
        <div className="ld-claude-prompts">
          {PROMPTS.map((p) => (
            <button key={p} type="button" onClick={() => { void navigator.clipboard?.writeText(p); toast('Copied. Paste it into Claude.') }}>
              “{p}”
            </button>
          ))}
        </div>
        <div className="ld-claude-foot">
          <span className="ld-muted">Phones and emails only ever come in the CSV, never in the chat.</span>
          <button type="button" className="ld-btn" disabled={busy} onClick={disconnect}>Disconnect Claude</button>
        </div>
      </div>
    </Dialog>
  )
}
