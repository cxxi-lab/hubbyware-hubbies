import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowsRotate, faCopy, faPen, faStop, faTrash } from '@fortawesome/free-solid-svg-icons'
import { Button, ConfirmationModal, Markdown } from '@cxxi-lab/hubbyware-ui'
import type { MessageDoc } from '../lib/data'

/**
 * A conversation (client docs/plan-ia-chat.md § 2.5): its messages (an assistant's in Markdown, with
 * Copy; the last one Regenerate), the answer as it comes, Stop, the composer (Enter sends, Shift+Enter
 * a new line), each answer's model and speed. Read-only where no model runs (D5).
 */

export interface Streaming { text: string, status?: string }

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false)
	return (
		<button type="button" onClick={() => void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })}
			className="bg-transparent border-0 p-0 text-xs text-steel-400 hover:text-white cursor-pointer">
			<FontAwesomeIcon icon={faCopy} /> {copied ? 'Copied' : 'Copy'}
		</button>
	)
}

function stats(m: MessageDoc): string | null {
	if (!m.tokens || !m.seconds) return m.model ?? null
	return `${m.model ?? ''} · ${m.tokens} tokens · ${(m.tokens / m.seconds).toFixed(0)} t/s`
}

export function ChatView({ title, summary, history, streaming, busy, error, readOnly, onSend, onStop, onRegenerate, onBack, onRename, onRemove }: {
	title: string | null
	/** what the model keeps of the older messages (its summary, up to which message) */
	summary: { text: string, upTo: string | null } | null
	history: MessageDoc[]
	streaming: Streaming | null
	busy: boolean
	error: string | null
	readOnly: boolean
	onSend: (text: string) => void
	onStop: () => void
	onRegenerate: () => void
	onBack?: () => void
	/** the conversation open: renamed, deleted */
	onRename?: (title: string) => void
	onRemove?: () => void
}) {
	const [draft, setDraft] = useState('')
	const [editing, setEditing] = useState<string | null>(null)
	const [removing, setRemoving] = useState(false)
	const end = useRef<HTMLDivElement>(null)
	const shown = history.filter(m => m.role !== 'tool')
	const last = shown.at(-1)
	useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [shown.length, streaming?.text])

	const send = () => {
		const text = draft.trim()
		if (!text || busy || readOnly) return
		setDraft('')
		onSend(text)
	}

	return (
		<div className="flex-1 min-h-0 min-w-0 flex flex-col">
			<header className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-steel-800">
				{onBack && <button type="button" aria-label="Back" onClick={onBack} className="bg-transparent border-0 p-1 text-steel-300 cursor-pointer"><FontAwesomeIcon icon={faArrowLeft} /></button>}
				{editing !== null ? (
					<input autoFocus value={editing} onChange={e => setEditing(e.target.value)}
						onBlur={() => { if (editing.trim() && editing.trim() !== title) onRename?.(editing.trim()); setEditing(null) }}
						onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null) }}
						className="flex-1 min-w-0 rounded bg-steel-800 px-2 py-1 text-base font-semibold text-white outline-none ring-1 ring-primary-500" />
				) : (
					<h1 className="m-0 flex-1 min-w-0 truncate text-base font-semibold text-white">{title ?? 'New chat'}</h1>
				)}
				{onRename && editing === null && (
					<button type="button" aria-label="Rename" onClick={() => setEditing(title ?? '')} className="shrink-0 bg-transparent border-0 p-1 text-xs text-steel-400 hover:text-white cursor-pointer"><FontAwesomeIcon icon={faPen} /></button>
				)}
				{onRemove && (
					<button type="button" aria-label="Delete" onClick={() => setRemoving(true)} className="shrink-0 bg-transparent border-0 p-1 text-xs text-steel-400 hover:text-red-300 cursor-pointer"><FontAwesomeIcon icon={faTrash} /></button>
				)}
			</header>
			{removing && onRemove && (
				<ConfirmationModal title="Delete this conversation?" confirmLabel="Delete" confirmColor="danger" onClose={() => setRemoving(false)}
					onConfirm={() => { setRemoving(false); onRemove() }}>
					<p className="m-0 text-sm text-steel-200">“{title}” and its messages are deleted, on every device.</p>
				</ConfirmationModal>
			)}
			<div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4" data-testid="messages">
				<div className="mx-auto max-w-3xl flex flex-col gap-4">
					{shown.length === 0 && !streaming && (
						<p className="m-0 mt-8 text-center text-sm text-steel-400">{readOnly ? 'AI models don\'t run on this device: your conversations can be read here, and continued on a device that runs them.' : 'Ask anything. The model runs on this device: nothing you write leaves it.'}</p>
					)}
					{shown.map(m => [m.role === 'user' ? (
						<div key={m.id} data-role="user" className="self-end max-w-[85%] rounded-lg bg-primary-500/20 px-3 py-2 text-sm text-white whitespace-pre-wrap break-words">{m.content}</div>
					) : (
						<div key={m.id} data-role="assistant" className="flex flex-col gap-1">
							<Markdown>{m.content}</Markdown>
							<div className="flex items-center gap-3 text-xs text-steel-500">
								<CopyButton text={m.content} />
								{m === last && !busy && !readOnly && (
									<button type="button" onClick={onRegenerate} className="bg-transparent border-0 p-0 text-xs text-steel-400 hover:text-white cursor-pointer"><FontAwesomeIcon icon={faArrowsRotate} /> Regenerate</button>
								)}
								<span data-testid="stats">{stats(m)}</span>
							</div>
						</div>
					), m.id === summary?.upTo && (
						// where the model's memory starts: what came before reaches it as a summary
						<details key={`${m.id}-summary`} data-testid="summary" className="rounded border border-dashed border-steel-700 px-3 py-2 text-xs text-steel-400">
							<summary className="cursor-pointer">Earlier messages are summarized for the model</summary>
							<p className="m-0 mt-2 whitespace-pre-wrap text-steel-300">{summary.text}</p>
						</details>
					)])}
					{streaming && (
						<div data-role="streaming" className="flex flex-col gap-1">
							{streaming.text ? <Markdown>{streaming.text}</Markdown> : <span className="text-sm text-steel-400">{streaming.status ?? '…'}</span>}
						</div>
					)}
					{error && <p className="m-0 text-xs text-red-300" data-testid="error">{error}</p>}
					<div ref={end} />
				</div>
			</div>
			<div className="px-4 sm:px-6 py-3 border-t border-steel-800">
				<div className="mx-auto max-w-3xl flex items-end gap-2">
					<textarea
						value={draft}
						disabled={readOnly}
						onChange={e => setDraft(e.target.value)}
						onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
						rows={Math.min(8, Math.max(1, draft.split('\n').length))}
						placeholder={readOnly ? 'Read-only on this device' : 'Message the model'}
						className="flex-1 resize-none rounded-lg bg-steel-800 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
					/>
					{busy
						? <Button label="Stop" icon={faStop} color="secondary" onClick={onStop} />
						: <Button label="Send" isDisabled={readOnly || !draft.trim()} onClick={send} />}
				</div>
			</div>
		</div>
	)
}
