import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { Button, ConfirmationModal } from '@cxxi-lab/hubbyware-ui'
import type { ConversationDoc } from '../lib/data'

/**
 * The conversations (client docs/plan-ia-chat.md § 2.3): the most recent first, by date; New chat;
 * a search in their titles; renamed, deleted.
 */

export function groupOf(iso: string, now = new Date()): string {
	const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
	const days = Math.round((day(now) - day(new Date(iso))) / 86_400_000)
	if (days <= 0) return 'Today'
	if (days === 1) return 'Yesterday'
	if (days < 7) return 'This week'
	return 'Earlier'
}

export function ConversationList({ items, active, onOpen, onNew, onRename, onRemove }: {
	items: ConversationDoc[] | null
	active: string | null
	onOpen: (id: string) => void
	onNew: () => void
	onRename: (id: string, title: string) => void
	onRemove: (id: string) => void
}) {
	const [query, setQuery] = useState('')
	const [editing, setEditing] = useState<{ id: string, title: string } | null>(null)
	const [removing, setRemoving] = useState<ConversationDoc | null>(null)
	const shown = (items ?? []).filter(c => !query.trim() || c.title.toLowerCase().includes(query.trim().toLowerCase()))
	const groups: Array<[string, ConversationDoc[]]> = []
	for (const c of shown) {
		const g = groupOf(c.lastMessageAt)
		const last = groups.at(-1)
		if (last?.[0] === g) last[1].push(c)
		else groups.push([g, [c]])
	}

	return (
		<div className="flex flex-col gap-3 min-h-0 h-full">
			<Button label="New chat" icon={faPlus} onClick={onNew} />
			<label className="flex items-center gap-2 rounded bg-steel-800 px-2.5 py-1.5 text-steel-300">
				<FontAwesomeIcon icon={faMagnifyingGlass} className="text-xs" />
				<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search" className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none" />
			</label>
			<div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 -mx-1 px-1">
				{items === null && <p className="m-0 text-xs text-steel-400">Loading…</p>}
				{items?.length === 0 && <p className="m-0 text-xs text-steel-400">No conversation yet.</p>}
				{items !== null && items.length > 0 && shown.length === 0 && <p className="m-0 text-xs text-steel-400">No title matches.</p>}
				{groups.map(([group, list]) => (
					<div key={group} className="flex flex-col gap-0.5">
						<div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-steel-400">{group}</div>
						{list.map(c => editing?.id === c.id ? (
							<input
								key={c.id}
								autoFocus
								value={editing.title}
								onChange={e => setEditing({ id: c.id, title: e.target.value })}
								onBlur={() => { if (editing.title.trim()) onRename(c.id, editing.title.trim()); setEditing(null) }}
								onKeyDown={e => {
									if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
									if (e.key === 'Escape') setEditing(null)
								}}
								className="rounded bg-steel-800 px-2 py-1.5 text-sm text-white outline-none ring-1 ring-primary-500"
							/>
						) : (
							<div key={c.id} className={`group flex items-center gap-1 rounded ${c.id === active ? 'bg-steel-800' : 'hover:bg-steel-800/60'}`}>
								<button type="button" onClick={() => onOpen(c.id)} data-conversation={c.id} className="flex-1 min-w-0 truncate bg-transparent border-0 px-2 py-1.5 text-left text-sm text-steel-100 cursor-pointer">
									{c.title}
								</button>
								<button type="button" aria-label="Rename" onClick={() => setEditing({ id: c.id, title: c.title })} className="shrink-0 bg-transparent border-0 p-1 text-xs text-steel-400 opacity-0 group-hover:opacity-100 hover:text-white cursor-pointer"><FontAwesomeIcon icon={faPen} /></button>
								<button type="button" aria-label="Delete" onClick={() => setRemoving(c)} className="shrink-0 bg-transparent border-0 p-1 pr-2 text-xs text-steel-400 opacity-0 group-hover:opacity-100 hover:text-red-300 cursor-pointer"><FontAwesomeIcon icon={faTrash} /></button>
							</div>
						))}
					</div>
				))}
			</div>
			{removing && (
				<ConfirmationModal title="Delete this conversation?" confirmLabel="Delete" confirmColor="danger" onClose={() => setRemoving(null)}
					onConfirm={() => { onRemove(removing.id); setRemoving(null) }}>
					<p className="m-0 text-sm text-steel-200">“{removing.title}” and its messages are deleted, on every device.</p>
				</ConfirmationModal>
			)}
		</div>
	)
}
