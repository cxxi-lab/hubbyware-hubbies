import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
	faArrowLeft, faBoxArchive, faEnvelope, faImage, faPaperclip, faReply, faReplyAll, faShare, faStar, faThumbtack, faTrash, faXmark,
	type IconDefinition
} from '@fortawesome/free-solid-svg-icons'
import { faStar as faStarOutline } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { errorMessage, getApiBaseUrl, IconButton } from '@cxxi-lab/hub-sdk'
import { fetchMessage, type BatchAction, type MailMessage } from '../api/mail'
import { addressLabel, addressList, fileSize, fullDate } from '../lib/format'

interface Props {
	messageId: string
	/** the account has an archive folder */
	canArchive: boolean
	onAction: (action: BatchAction) => void
	/** once opened, the message reads as seen */
	onOpened: (message: MailMessage) => void
	/** phones: back to the list */
	onBack?: () => void
	/** wide screens: closes the reader panel */
	onClose?: () => void
	/** reply, reply to all, forward: opens the composer on it */
	onCompose: (kind: 'reply' | 'replyAll' | 'forward', message: MailMessage) => void
}

// Mail is written for a white page: the body keeps one whatever the app theme.
const BODY_CSS = `
	html, body { margin: 0; background: #fff; color: #111; }
	body { padding: 16px; font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow-wrap: anywhere; }
	img { max-width: 100%; height: auto; }
	table { max-width: 100%; }
	pre { white-space: pre-wrap; font: inherit; margin: 0; }
	a { color: #2563eb; }
`

/**
 * The sanitized body, isolated: no scripts, no same origin, and a CSP that only
 * lets images in from the API (inline images, proxied remote ones) — anything
 * else the HTML points at stays blocked. Links open outside the app.
 */
function bodyDocument(content: string): string {
	const api = new URL(getApiBaseUrl()).origin
	const csp = `default-src 'none'; img-src data: ${api}; style-src 'unsafe-inline'; font-src data:`
	return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank"><style>${BODY_CSS}</style></head><body>${content}</body></html>`
}

function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Plain-text body: escaped, links made clickable. */
function textToHtml(text: string): string {
	const linked = escapeHtml(text).replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, url => `<a href="${url}">${url}</a>`)
	return `<pre>${linked}</pre>`
}

export function MessageView({ messageId, canArchive, onAction, onOpened, onBack, onClose, onCompose }: Props) {
	const [message, setMessage] = useState<MailMessage | null>(null)
	const [images, setImages] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		setImages(false)
	}, [messageId])

	useEffect(() => {
		let alive = true
		setError(null)
		fetchMessage(messageId, images)
			.then(m => {
				if (!alive) return
				setMessage(m)
				onOpened(m)
			})
			.catch(err => { if (alive) setError(errorMessage(err, 'Failed to load the message')) })
		return () => { alive = false }
		// onOpened is left out: it changes identity on each list render.
	}, [messageId, images])

	const current = message?.id === messageId ? message : null
	const srcDoc = useMemo(() => {
		if (!current) return null
		if (current.html) return bodyDocument(current.html)
		return bodyDocument(textToHtml(current.text ?? ''))
	}, [current])
	const files = current?.attachments.filter(a => !a.inline) ?? []

	return (
		<div className="flex-1 min-w-0 min-h-0 flex flex-col bg-steel-950">
			<div className="flex items-center gap-1 px-3 h-12 border-b border-steel-800 shrink-0">
				{onBack && <IconButton icon={faArrowLeft} color="dark" onClick={onBack} title="Back" aria-label="Back" />}
				<div className="flex-1" />
				{canArchive && <IconButton icon={faBoxArchive} color="dark" onClick={() => onAction('archive')} title="Archive" aria-label="Archive" />}
				<IconButton icon={faTrash} color="dark" onClick={() => onAction('delete')} title="Delete" aria-label="Delete" />
				<IconButton icon={faEnvelope} color="dark" onClick={() => onAction('unread')} title="Mark as unread" aria-label="Mark as unread" />
				<IconButton
					icon={faThumbtack}
					color="dark"
					highlighted={!!current?.pinnedAt}
					onClick={() => {
						if (!current) return
						onAction(current.pinnedAt ? 'unpin' : 'pin')
						setMessage({ ...current, pinnedAt: current.pinnedAt ? null : new Date().toISOString() })
					}}
					title={current?.pinnedAt ? 'Unpin' : 'Pin to the top'}
					aria-label={current?.pinnedAt ? 'Unpin' : 'Pin'}
				/>
				<IconButton
					icon={current?.flagged ? faStar : faStarOutline}
					color="dark"
					highlighted={current?.flagged}
					onClick={() => {
						if (!current) return
						onAction(current.flagged ? 'unflag' : 'flag')
						setMessage({ ...current, flagged: !current.flagged })
					}}
					title={current?.flagged ? 'Remove from favourites' : 'Add to favourites'}
					aria-label={current?.flagged ? 'Unstar' : 'Star'}
				/>
				{onClose && (
					<>
						<span aria-hidden className="mx-1 h-5 w-px bg-steel-700" />
						<IconButton icon={faXmark} color="dark" onClick={onClose} title="Close" aria-label="Close" />
					</>
				)}
			</div>

			{error ? (
				<div className="p-6 text-sm text-red-400 break-words">{error}</div>
			) : !current ? (
				<div className="p-6 text-sm text-steel-400">Loading…</div>
			) : (
				<>
					<header className="px-5 py-4 border-b border-steel-800 flex flex-col gap-2 shrink-0">
						<h1 className="text-lg font-semibold text-white break-words">{current.subject || '(no subject)'}</h1>
						<div className="flex items-baseline justify-between gap-3 text-sm">
							<div className="min-w-0">
								<span className="text-steel-100 font-medium">{addressLabel(current.from)}</span>
								{current.from?.name && <span className="text-steel-400"> &lt;{current.from.address}&gt;</span>}
							</div>
							<time className="text-xs text-steel-400 shrink-0">{fullDate(current.date)}</time>
						</div>
						<Recipients label="To" value={addressList(current.to)} />
						{current.cc.length > 0 && <Recipients label="Cc" value={addressList(current.cc)} />}
						{files.length > 0 && (
							<div className="flex flex-wrap gap-2 pt-1">
								{files.map(a => (
									<a
										key={a.id}
										href={a.url}
										target="_blank"
										rel="noreferrer"
										className="flex items-center gap-2 px-2.5 h-8 rounded border border-steel-700 bg-steel-900 hover:border-steel-500 text-xs text-steel-100 no-underline max-w-full"
									>
										<FontAwesomeIcon icon={faPaperclip} className="text-steel-400" />
										<span className="truncate">{a.filename ?? 'attachment'}</span>
										<span className="text-steel-500 shrink-0">{fileSize(a.size)}</span>
									</a>
								))}
							</div>
						)}
					</header>
					{current.remoteImages && !images && !current.imagesShown && (
						<Banner>
							Remote images are blocked.
							<button type="button" onClick={() => setImages(true)} className="ml-2 inline-flex items-center gap-1.5 text-primary-500 bg-transparent border-0 cursor-pointer p-0">
								<FontAwesomeIcon icon={faImage} />
								Show images
							</button>
						</Banner>
					)}
					<iframe
						key={`${current.id}-${images}`}
						title="Message body"
						srcDoc={srcDoc ?? ''}
						sandbox="allow-popups allow-popups-to-escape-sandbox"
						className="flex-1 min-h-0 w-full border-0 bg-white"
					/>
					<footer className="flex items-center gap-2 px-3 py-2 border-t border-steel-800 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
						<ComposeButton icon={faReply} label="Reply" onClick={() => onCompose('reply', current)} />
						<ComposeButton icon={faReplyAll} label="Reply all" onClick={() => onCompose('replyAll', current)} />
						<ComposeButton icon={faShare} label="Forward" onClick={() => onCompose('forward', current)} />
					</footer>
				</>
			)}
		</div>
	)
}

function ComposeButton({ icon, label, onClick }: { icon: IconDefinition, label: string, onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex-1 sm:flex-none whitespace-nowrap flex items-center justify-center gap-2 px-3 h-9 rounded border border-steel-700 bg-transparent hover:bg-steel-800 text-sm text-steel-100 cursor-pointer"
		>
			<FontAwesomeIcon icon={icon} className="text-steel-400" />
			{label}
		</button>
	)
}

function Recipients({ label, value }: { label: string; value: string }) {
	return (
		<div className="text-xs text-steel-400 break-words">
			<span className="text-steel-500">{label}: </span>{value || '—'}
		</div>
	)
}

function Banner({ children }: { children: ReactNode }) {
	return <div className="px-5 py-2 text-xs text-steel-300 bg-steel-900 border-b border-steel-800 shrink-0">{children}</div>
}
