import { useEffect, useState } from 'react'
import { Modal, Switch } from '@cxxi-lab/hubbyware-ui'
import { ai, errorMessage } from '@cxxi-lab/hubbyware-sdk'

/**
 * What the assistant may use (client docs/plan-ia-agent.md D2): nothing by default; the user opens it
 * hubby by hubby (an account's setting, synced). The app asks before anything that changes data, and
 * always before anything reaching outside Hubbyware.
 */

type Access = Awaited<ReturnType<typeof ai.agent.access>>

export function AssistantDialog({ onClose }: { onClose: () => void }) {
	const [access, setAccess] = useState<Access | null>(null)
	const [error, setError] = useState<string | null>(null)
	useEffect(() => { void ai.agent.access().then(setAccess, err => setError(errorMessage(err))) }, [])

	const toggle = async (hubby: string, on: boolean) => {
		if (!access) return
		const next = on ? [...access.opened, hubby] : access.opened.filter(id => id !== hubby)
		try { setAccess({ ...access, opened: await ai.agent.setAccess(next) }) }
		catch (err) { setError(errorMessage(err)) }
	}

	return (
		<Modal title="Assistant" size="md" onClose={onClose}>
			<div className="flex flex-col gap-3 text-sm text-steel-200" data-testid="assistant-access">
				<p className="m-0 text-xs text-steel-400">The hubbies the assistant may use. It asks you before it changes anything, and always before it sends anything out of Hubbyware.</p>
				{error && <p className="m-0 text-xs text-red-300">{error}</p>}
				{access === null && !error && <p className="m-0 text-xs text-steel-400">Loading…</p>}
				{access?.hubbies.length === 0 && <p className="m-0 text-xs text-steel-400">None of your hubbies offers anything to an assistant yet.</p>}
				{access?.hubbies.map(h => (
					<div key={h.hubby} className="flex items-center gap-3 rounded border border-steel-800 px-3 py-2" data-hubby={h.hubby}>
						<div className="flex-1 min-w-0">
							<div className="text-white">{h.label}</div>
							<div className="text-xs text-steel-400">{h.methods} action{h.methods > 1 ? 's' : ''}: reads{h.writes ? ', changes your data' : ''}{h.outward ? ', sends out' : ''}</div>
						</div>
						<Switch checked={access.opened.includes(h.hubby)} onChange={on => void toggle(h.hubby, on)} title={`Let the assistant use ${h.label}`} />
					</div>
				))}
			</div>
		</Modal>
	)
}
