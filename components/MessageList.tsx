import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode, type TouchEvent } from 'react'
import { faCheck, faMinus, faPaperclip, faStar, faThumbtack } from '@fortawesome/free-solid-svg-icons'
import { faStar as faStarOutline } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { MailAddress, MailMessageSummary } from '../api/mail'
import { addressLabel, badgeColour, initials, listDate } from '../lib/format'

interface Props {
	messages: MailMessageSummary[]
	selectedId: string | null
	loading: boolean
	/** more to load below (from the mirror or the server) */
	hasMore: boolean
	onSelect: (message: MailMessageSummary) => void
	onLoadMore: () => void
	/** sent mail lists recipients instead of senders */
	showRecipients: boolean
	/** messages ticked for a bulk action */
	checked: ReadonlySet<string>
	onCheck: (ids: string[], on: boolean) => void
	/** phones: a long press ticks a row (and shows the tick boxes); while some are, a tap ticks too */
	touch: boolean
	/** the tick boxes shown */
	selecting: boolean
	/** phones: pulled down from the top, the list checks for new mail */
	onRefresh?: () => void
	/** the state column: read dot, pin, star, each toggled without opening the message */
	onToggle: (message: MailMessageSummary, what: 'seen' | 'pinned' | 'flagged') => void
}

/** How long a press is held to tick a row (phones), in ms. */
const LONG_PRESS_MS = 450
/** How far (px, after damping) the list is pulled to check for new mail (phones), and at most. */
const PULL_TRIGGER = 64
const PULL_MAX = 96

export function MessageList({ messages, selectedId, loading, hasMore, onSelect, onLoadMore, showRecipients, checked, onCheck, touch, selecting, onRefresh, onToggle }: Props) {
	const sentinel = useRef<HTMLDivElement>(null)
	const loadMore = useRef(onLoadMore)
	loadMore.current = onLoadMore
	// the last box ticked by hand: shift-click ticks (or unticks) the range from it
	const anchor = useRef<string | null>(null)

	const tick = (m: MailMessageSummary, shift: boolean) => {
		const on = !checked.has(m.id)
		const from = anchor.current === null ? -1 : messages.findIndex(x => x.id === anchor.current)
		const to = messages.findIndex(x => x.id === m.id)
		if (shift && from !== -1) {
			const [a, b] = from < to ? [from, to] : [to, from]
			onCheck(messages.slice(a, b + 1).map(x => x.id), on)
		}
		else {
			onCheck([m.id], on)
		}
		anchor.current = m.id
	}

	// the long press (phones): a press held LONG_PRESS_MS without moving ticks the row; the click
	// that ends it is swallowed
	const press = useRef<{ id: string, x: number, y: number, timer: ReturnType<typeof setTimeout> } | null>(null)
	const pressed = useRef<string | null>(null)
	const cancelPress = () => {
		if (press.current) clearTimeout(press.current.timer)
		press.current = null
	}
	useEffect(() => cancelPress, [])
	const pressHandlers = (m: MailMessageSummary) => touch ? {
		onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
			cancelPress()
			pressed.current = null
			press.current = {
				id: m.id, x: e.clientX, y: e.clientY,
				timer: setTimeout(() => {
					press.current = null
					pressed.current = m.id
					if (!checked.has(m.id)) onCheck([m.id], true)
					navigator.vibrate?.(20)
				}, LONG_PRESS_MS)
			}
		},
		onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
			const p = press.current
			if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) cancelPress()
		},
		onPointerUp: cancelPress,
		onPointerCancel: cancelPress,
		onContextMenu: (e: MouseEvent<HTMLDivElement>) => e.preventDefault()
	} : {}

	// pull to refresh (phones): dragged down while at the top, past PULL_TRIGGER
	const [pull, setPull] = useState(0)
	const pullStart = useRef<number | null>(null)
	const endPull = () => {
		if (pull >= PULL_TRIGGER) onRefresh?.()
		pullStart.current = null
		setPull(0)
	}
	const pullHandlers = touch && onRefresh ? {
		onTouchStart: (e: TouchEvent<HTMLDivElement>) => {
			pullStart.current = e.currentTarget.scrollTop <= 0 ? e.touches[0].clientY : null
		},
		onTouchMove: (e: TouchEvent<HTMLDivElement>) => {
			if (pullStart.current === null) return
			const dy = e.touches[0].clientY - pullStart.current
			setPull(dy > 0 && e.currentTarget.scrollTop <= 0 ? Math.min(PULL_MAX, dy * 0.5) : 0)
		},
		onTouchEnd: endPull,
		onTouchCancel: () => { pullStart.current = null; setPull(0) }
	} : {}
	const pullIndicator = pull > 0 && (
		<div className={`shrink-0 flex items-end justify-center pb-2 overflow-hidden text-xs ${pull >= PULL_TRIGGER ? 'text-primary-500' : 'text-steel-500'}`} style={{ height: pull }}>
			{pull >= PULL_TRIGGER ? 'Release to refresh' : 'Pull to refresh'}
		</div>
	)

	const open = (m: MailMessageSummary) => {
		if (pressed.current === m.id) { pressed.current = null; return }
		if (touch && checked.size > 0) onCheck([m.id], !checked.has(m.id))
		else onSelect(m)
	}

	useEffect(() => {
		const el = sentinel.current
		if (!el || !hasMore) return
		const observer = new IntersectionObserver(entries => {
			if (entries[0].isIntersecting) loadMore.current()
		}, { rootMargin: '400px' })
		observer.observe(el)
		return () => observer.disconnect()
	}, [hasMore, messages.length])

	if (messages.length === 0) {
		return (
			<div {...pullHandlers} className="flex-1 flex flex-col overflow-y-auto overscroll-y-contain">
				{pullIndicator}
				<div className="flex-1 flex items-center justify-center text-sm text-steel-400">
					{loading ? 'Loading…' : 'No messages'}
				</div>
			</div>
		)
	}

	return (
		<div {...pullHandlers} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
			{pullIndicator}
			{messages.map(m => {
				const selected = m.id === selectedId
				const who = showRecipients ? (m.to.map(a => a.name || a.address).join(', ') || '(no recipient)') : addressLabel(m.from)
				const ticked = checked.has(m.id)
				return (
					<div
						key={m.id}
						role="button"
						tabIndex={0}
						onClick={() => open(m)}
						onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) onSelect(m) }}
						{...pressHandlers(m)}
						className={[
							touch ? 'select-none [-webkit-touch-callout:none]' : '',
							selecting ? 'pl-2' : touch ? 'pl-4' : 'pl-3', touch ? 'pr-2' : 'pr-4',
							'group/row w-full text-left flex items-center gap-2 py-2.5 border-b border-steel-800 cursor-pointer outline-none focus-visible:bg-steel-900',
							selected ? 'bg-primary-500/15' : ticked ? 'bg-primary-500/5 hover:bg-steel-900' : 'hover:bg-steel-900'
						].join(' ')}
					>
						{selecting && <TickBox
							checked={ticked}
							label={ticked ? 'Untick' : 'Tick'}
							onClick={e => { e.stopPropagation(); tick(m, e.shiftKey) }}
						/>}
						{!touch && <StateColumn message={m} onToggle={what => onToggle(m, what)} />}
						<span className="flex-1 min-w-0 flex flex-col gap-0.5">
							<span className="flex items-center gap-2 min-w-0">
								<SenderBadge address={showRecipients ? (m.to[0] ?? null) : m.from} logo={showRecipients ? null : m.senderLogo} />
								<span className={`flex-1 truncate text-sm ${m.seen ? 'text-steel-300' : 'text-white font-semibold'}`}>{who}</span>
								<time className="text-xs text-steel-500 shrink-0 tabular-nums">{listDate(m.date)}</time>
							</span>
							<span className="flex items-center gap-2 min-w-0">
								{m.hasAttachments && (
									<span className="shrink-0 inline-flex items-center gap-1 h-5 px-1.5 rounded bg-steel-800 text-[11px] text-steel-300" title="Attachments">
										<FontAwesomeIcon icon={faPaperclip} className="text-[10px]" />
									</span>
								)}
								<span className={`truncate text-sm ${m.seen ? 'text-steel-400' : 'text-steel-100'}`}>{m.subject || '(no subject)'}</span>
							</span>
							{m.snippet && <span className="truncate text-xs text-steel-500">{snippetText(m.snippet)}</span>}
						</span>
						{/* phones: the states on the right, by the thumb */}
						{touch && <StateColumn message={m} onToggle={what => onToggle(m, what)} />}
					</div>
				)
			})}
			{hasMore && (
				<div ref={sentinel} className="py-4 text-center text-xs text-steel-500">
					{loading ? 'Loading…' : ''}
				</div>
			)}
		</div>
	)
}

/** The sender's logo (its domain's, when checked genuine), else its initials on a steady colour. */
function SenderBadge({ address, logo }: { address: MailAddress | null, logo: string | null }) {
	const [broken, setBroken] = useState(false)
	if (logo && !broken) {
		// The white (for logos drawn on transparency) sits a pixel inside the frame: on fractional
		// display scales the logo's edge falls on a half pixel, which must blend into the row, not white.
		return (
			<span className="relative size-[18px] shrink-0 rounded overflow-hidden">
				<span aria-hidden className="absolute inset-px rounded-[3px] bg-white" />
				<img src={logo} alt="" className="relative size-full object-contain" loading="lazy" onError={() => setBroken(true)} />
			</span>
		)
	}
	return (
		<span
			aria-hidden
			className="size-[18px] shrink-0 rounded flex items-center justify-center text-[8px] leading-none font-bold text-white/90 pt-[0.5px]"
			style={{ backgroundColor: badgeColour(address) }}
		>
			{initials(address)}
		</span>
	)
}

/**
 * A row's states, stacked: read dot, pin, star. Each is a button; an unset one stays in sight, dimmed.
 */
function StateColumn({ message: m, onToggle }: { message: MailMessageSummary, onToggle: (what: 'seen' | 'pinned' | 'flagged') => void }) {
	const button = (what: 'seen' | 'pinned' | 'flagged', label: string, content: ReactNode) => (
		<button
			type="button"
			onClick={e => { e.stopPropagation(); onToggle(what) }}
			title={label}
			aria-label={label}
			className="group/state size-[18px] flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer"
		>
			{content}
		</button>
	)
	const unset = 'text-steel-700 group-hover/state:text-steel-100'
	return (
		<span className="shrink-0 flex flex-col items-center">
			{button('seen', m.seen ? 'Mark as unread' : 'Mark as read', (
				<span className={`size-2 rounded-full transition-colors ${m.seen
					? 'border border-steel-700 group-hover/state:border-steel-100'
					: 'bg-primary-500 group-hover/state:bg-primary-300'}`} />
			))}
			{button('pinned', m.pinnedAt ? 'Unpin' : 'Pin to the top', (
				<FontAwesomeIcon icon={faThumbtack} className={`text-[11px] transition ${m.pinnedAt ? 'text-product-red' : `rotate-45 ${unset}`}`} />
			))}
			{button('flagged', m.flagged ? 'Remove from favourites' : 'Add to favourites', (
				<FontAwesomeIcon icon={m.flagged ? faStar : faStarOutline} className={`text-[11px] transition ${m.flagged ? 'text-product-yellow' : unset}`} />
			))}
		</span>
	)
}

/** A tick box of the list (CheckboxField's look), half-ticked when some of a set are. */
export function TickBox({ checked, partial = false, label, onClick }: {
	checked: boolean
	partial?: boolean
	label: string
	onClick: (e: MouseEvent<HTMLButtonElement>) => void
}) {
	const on = checked || partial
	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={partial ? 'mixed' : checked}
			aria-label={label}
			title={label}
			onClick={onClick}
			className="size-5 shrink-0 flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer"
		>
			<span className={`size-[14px] flex items-center justify-center rounded-xs border text-[9px] transition-colors ${on
				? 'bg-primary-700 text-primary-500 border-primary-500'
				: 'bg-transparent text-transparent border-steel-500 hover:border-steel-300'}`}>
				<FontAwesomeIcon icon={partial ? faMinus : faCheck} />
			</span>
		</button>
	)
}

/** The server keeps a snippet's first SNIPPET_LENGTH characters: one that long was cut, and says so. */
const SNIPPET_LENGTH = 200
function snippetText(snippet: string): string {
	return [...snippet].length >= SNIPPET_LENGTH ? `${snippet.trimEnd()}…` : snippet
}

