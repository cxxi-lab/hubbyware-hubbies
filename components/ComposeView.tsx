import { useEffect, useRef, useState } from 'react'
import { faPaperclip, faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { errorMessage, useBackHandler } from '@cxxi-lab/hub-sdk'
import { sendMessage, type MailAccount } from '../api/mail'
import type { Draft } from '../lib/compose'
import { fileSize } from '../lib/format'

const TITLES: Record<Draft['kind'], string> = { new: 'New message', reply: 'Reply', replyAll: 'Reply to all', forward: 'Forward' }

/**
 * Writing a message: a page of Mail (in place of the list and the reader; the whole screen on
 * phones). The draft lives in the Mail page
 * (`onChange`): closed unsent, it is found again by the next "new message".
 */
export function ComposeView({ accounts, draft, onChange, onClose, onSent }: {
	accounts: MailAccount[]
	draft: Draft
	onChange: (draft: Draft) => void
	onClose: () => void
	onSent: () => void
}) {
	useBackHandler(true, onClose)
	const [sending, setSending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [copies, setCopies] = useState(draft.cc !== '' || draft.bcc !== '')
	const fileInput = useRef<HTMLInputElement>(null)
	const body = useRef<HTMLTextAreaElement>(null)
	const toInput = useRef<HTMLInputElement>(null)

	// a reply starts above the quote; a new message or a forward at its recipients
	useEffect(() => {
		if (draft.kind === 'reply' || draft.kind === 'replyAll') {
			body.current?.focus()
			body.current?.setSelectionRange(0, 0)
			body.current?.scrollTo({ top: 0 })
		}
		else toInput.current?.focus()
	}, [])

	const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch })
	const account = accounts.find(a => a.id === draft.accountId) ?? accounts[0]

	const send = async () => {
		if (!draft.to.trim() && !draft.cc.trim() && !draft.bcc.trim()) {
			setError('Add a recipient')
			return
		}
		setSending(true)
		setError(null)
		try {
			await sendMessage({
				accountId: account.id, to: draft.to, cc: draft.cc, bcc: draft.bcc,
				subject: draft.subject, text: draft.text,
				replyTo: draft.replyTo, forwardOf: draft.forwardOf, files: draft.files
			})
			onSent()
		}
		catch (err) {
			setError(errorMessage(err, 'Sending failed'))
			setSending(false)
		}
	}

	const field = 'flex items-center gap-2 px-4 min-h-11 border-b border-steel-800'
	const label = 'w-14 shrink-0 text-xs text-steel-500'
	const input = 'flex-1 min-w-0 h-10 bg-transparent border-0 outline-none text-sm text-steel-100 placeholder:text-steel-600'

	return (
		<section data-compose className="flex-1 min-w-0 min-h-0 flex flex-col bg-steel-950">
			<div className="flex-1 min-h-0 w-full flex flex-col">
				<header className="flex items-center gap-2 pl-2 pr-3 h-12 border-b border-steel-800 shrink-0">
					<button type="button" onClick={onClose} title="Close" aria-label="Close" className="size-9 flex items-center justify-center rounded bg-transparent border-0 text-steel-300 hover:text-white cursor-pointer">
						<FontAwesomeIcon icon={faXmark} />
					</button>
					<h1 className="flex-1 min-w-0 truncate text-sm font-semibold text-white">{TITLES[draft.kind]}</h1>
					<button type="button" onClick={() => fileInput.current?.click()} title="Attach files" aria-label="Attach files" className="size-9 flex items-center justify-center rounded bg-transparent border-0 text-steel-300 hover:text-white cursor-pointer">
						<FontAwesomeIcon icon={faPaperclip} />
					</button>
					<input
						ref={fileInput}
						type="file"
						multiple
						hidden
						onChange={e => {
							const picked = Array.from(e.target.files ?? [])
							if (picked.length > 0) set({ files: [...draft.files, ...picked] })
							e.target.value = ''
						}}
					/>
					<button
						type="button"
						onClick={() => void send()}
						disabled={sending}
						className="shrink-0 whitespace-nowrap flex items-center gap-2 px-3 h-8 rounded bg-primary-500 hover:bg-primary-300 text-steel-950 text-sm font-semibold border-0 cursor-pointer disabled:opacity-50 disabled:cursor-default"
					>
						<FontAwesomeIcon icon={faPaperPlane} />
						{sending ? 'Sending…' : 'Send'}
					</button>
				</header>

				{error && <div className="px-4 py-2 text-xs text-red-300 border-b border-steel-800 break-words shrink-0">{error}</div>}

				<div className="shrink-0">
					<div className={field}>
						<span className={label}>From</span>
						{accounts.length > 1 ? (
							<select
								value={account.id}
								onChange={e => set({ accountId: e.target.value })}
								className="flex-1 min-w-0 h-9 bg-transparent border-0 text-sm text-steel-100 outline-none"
							>
								{accounts.map(a => <option key={a.id} value={a.id}>{a.email}</option>)}
							</select>
						) : (
							<span className="flex-1 min-w-0 truncate text-sm text-steel-300">{account.email}</span>
						)}
					</div>
					<div className={field}>
						<span className={label}>To</span>
						<input ref={toInput} type="text" inputMode="email" autoComplete="off" value={draft.to} onChange={e => set({ to: e.target.value })} className={input} />
						{!copies && (
							<button type="button" onClick={() => setCopies(true)} className="shrink-0 text-xs text-steel-400 hover:text-white bg-transparent border-0 cursor-pointer">Cc/Bcc</button>
						)}
					</div>
					{copies && (
						<>
							<div className={field}>
								<span className={label}>Cc</span>
								<input type="text" inputMode="email" autoComplete="off" value={draft.cc} onChange={e => set({ cc: e.target.value })} className={input} />
							</div>
							<div className={field}>
								<span className={label}>Bcc</span>
								<input type="text" inputMode="email" autoComplete="off" value={draft.bcc} onChange={e => set({ bcc: e.target.value })} className={input} />
							</div>
						</>
					)}
					<div className={field}>
						<input type="text" placeholder="Subject" value={draft.subject} onChange={e => set({ subject: e.target.value })} className={`${input} font-medium`} />
					</div>
					{(draft.forwarded.length > 0 || draft.files.length > 0) && (
						<div className="flex flex-wrap gap-2 px-4 py-2 border-b border-steel-800">
							{draft.forwarded.map(a => (
								<span key={`f${a.id}`} className="flex items-center gap-2 px-2.5 h-7 rounded border border-steel-700 bg-steel-900 text-xs text-steel-300 max-w-full">
									<FontAwesomeIcon icon={faPaperclip} className="text-steel-500" />
									<span className="truncate">{a.filename ?? 'attachment'}</span>
									<span className="text-steel-500 shrink-0">{fileSize(a.size)}</span>
								</span>
							))}
							{draft.files.map((f, i) => (
								<span key={`u${i}`} className="flex items-center gap-2 pl-2.5 pr-1 h-7 rounded border border-steel-700 bg-steel-900 text-xs text-steel-100 max-w-full">
									<FontAwesomeIcon icon={faPaperclip} className="text-steel-500" />
									<span className="truncate">{f.name}</span>
									<span className="text-steel-500 shrink-0">{fileSize(f.size)}</span>
									<button
										type="button"
										onClick={() => set({ files: draft.files.filter((_, j) => j !== i) })}
										title="Remove"
										aria-label="Remove"
										className="size-5 flex items-center justify-center bg-transparent border-0 text-steel-400 hover:text-white cursor-pointer"
									>
										<FontAwesomeIcon icon={faXmark} className="text-[10px]" />
									</button>
								</span>
							))}
						</div>
					)}
				</div>

				<textarea
					ref={body}
					value={draft.text}
					onChange={e => set({ text: e.target.value })}
					placeholder="Write your message"
					className="flex-1 min-h-0 w-full resize-none px-4 py-3 bg-transparent border-0 outline-none text-sm leading-relaxed text-steel-100 placeholder:text-steel-600"
				/>
			</div>
		</section>
	)
}
