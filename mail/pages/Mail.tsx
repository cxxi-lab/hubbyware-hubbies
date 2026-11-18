import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { faBan, faBoxArchive, faChevronDown, faPen, faEnvelope, faEnvelopeOpen, faFileLines, faFolder, faInbox, faPaperPlane, faPlus, faRotate, faStar, faThumbtack, faTrash, faTrashCan, faXmark, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { faStar as faStarOutline } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { BottomBar, errorMessage, storage, useBackHandler, useMediaQuery, type BottomBarTab } from '@cxxi-lab/hubbyware-sdk'
import {
	batchMessages, fetchAccounts, fetchMessages, syncAccount, syncFolder,
	type BatchAction, type FolderRole, type MailAccount, type MailFolder, type MailMessage, type MailMessageSummary
} from '../api/mail'
import { FolderNav } from '../components/FolderNav'
import { PROVIDERS } from '../components/AccountModal'
import { MessageList, TickBox } from '../components/MessageList'
import { MessageView } from '../components/MessageView'
import { ComposeView } from '../components/ComposeView'
import { draftFrom, newDraft, type Draft } from '../lib/compose'
import { primaryButtonClass } from '../components/fields'
import { timeAgo } from '../lib/format'

const FOLDER_KEY = 'mail.folder'
/** The open folder re-syncs this often while the page is shown. */
const REFRESH_MS = 2 * 60 * 1000

function storedFolderId(): string | null {
	try {
		return storage.getItem(FOLDER_KEY) || null
	}
	catch {
		return null
	}
}

export function Mail() {
	const phone = useMediaQuery('(width < 40rem)')
	const [accounts, setAccounts] = useState<MailAccount[] | null>(null)
	const [folderId, setFolderId] = useState<string | null>(storedFolderId)
	const [messages, setMessages] = useState<MailMessageSummary[]>([])
	const [hasMore, setHasMore] = useState(false)
	const [hasOlderOnServer, setHasOlderOnServer] = useState(false)
	const [loading, setLoading] = useState(false)
	const [syncing, setSyncing] = useState(false)
	const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null)
	const [selectedId, setSelectedId] = useState<string | null>(null)
	/** messages ticked for a bulk action (in the folder shown) */
	const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
	const [error, setError] = useState<string | null>(null)
	/** the message being written (kept while the composer is closed, until sent) */
	const [draft, setDraft] = useState<Draft | null>(null)
	const [composing, setComposing] = useState(false)
	const [notice, setNotice] = useState<string | null>(null)
	const loadingMore = useRef(false)

	const folders = accounts?.flatMap(a => a.folders) ?? []
	const folder = folders.find(f => f.id === folderId) ?? null
	const account = accounts?.find(a => a.id === folder?.accountId) ?? null
	const canArchive = !!account?.folders.some(f => f.role === 'archive') && folder?.role !== 'archive'

	const reloadAccounts = useCallback(() => {
		return fetchAccounts()
			.then(data => { setAccounts(data); return data })
			.catch(err => { setError(errorMessage(err, 'Failed to load the mailboxes')); return null })
	}, [])

	useEffect(() => { reloadAccounts() }, [reloadAccounts])
	// Mailboxes change in the Settings window: caught up when this one comes back to the front.
	useEffect(() => {
		const onFocus = () => { reloadAccounts() }
		window.addEventListener('focus', onFocus)
		return () => window.removeEventListener('focus', onFocus)
	}, [reloadAccounts])

	// Without a (still existing) folder picked, open the first account's Inbox.
	useEffect(() => {
		if (!accounts || folder) return
		const inbox = accounts.flatMap(a => a.folders).find(f => f.role === 'inbox') ?? accounts[0]?.folders[0]
		if (inbox) setFolderId(inbox.id)
	}, [accounts, folder])

	useEffect(() => {
		if (folderId === null) return
		storage.setItem(FOLDER_KEY, String(folderId))
	}, [folderId])

	const updateFolder = useCallback((next: MailFolder) => {
		setAccounts(prev => prev?.map(a => ({ ...a, folders: a.folders.map(f => (f.id === next.id ? next : f)) })) ?? prev)
	}, [])

	const applyPage = useCallback((page: Awaited<ReturnType<typeof fetchMessages>>, append: boolean) => {
		setMessages(prev => {
			if (!append) return page.data
			const known = new Set(prev.map(m => m.id))
			return [...prev, ...page.data.filter(m => !known.has(m.id))]
		})
		setHasMore(page.hasMore)
		setHasOlderOnServer(page.hasOlderOnServer)
		updateFolder(page.folder)
	}, [updateFolder])

	/** The mirror at once, then a sync with the server and the refreshed first page. */
	const refresh = useCallback(async (id: string, showMirror: boolean) => {
		if (showMirror) {
			setLoading(true)
			try { applyPage(await fetchMessages(id), false) }
			catch (err) { setError(errorMessage(err, 'Failed to load the messages')) }
			finally { setLoading(false) }
		}
		setSyncing(true)
		try {
			await syncFolder(id)
			applyPage(await fetchMessages(id), false)
			setError(null)
		}
		catch (err) {
			setError(errorMessage(err, 'Sync failed'))
		}
		finally {
			setSyncing(false)
		}
	}, [applyPage])

	// The page stays mounted while away (KeepAlive): coming back to it, or to the app with it shown,
	// checks the folder with the provider at once instead of waiting for the next round.
	const shown = useLocation().pathname === '/mail'
	const navigate = useNavigate()
	// back from the mailboxes' screen (Hubbies > Mail): what changed there
	useEffect(() => { if (shown) reloadAccounts() }, [shown, reloadAccounts])
	// a link to a folder (a notification: /mail?folder=<id>): open it, then drop the parameter
	const [params, setParams] = useSearchParams()
	const linkedFolder = shown ? params.get('folder') ?? '' : ''
	useEffect(() => {
		if (!linkedFolder) return
		setFolderId(linkedFolder)
		setSelectedId(null)
		setParams({}, { replace: true })
	}, [linkedFolder, setParams])
	const wasShown = useRef(shown)
	useEffect(() => {
		const back = shown && !wasShown.current
		wasShown.current = shown
		if (back && folderId !== null) refresh(folderId, false)
	}, [shown, folderId, refresh])
	useEffect(() => {
		if (!shown || folderId === null) return
		const onFocus = () => refresh(folderId, false)
		window.addEventListener('focus', onFocus)
		return () => window.removeEventListener('focus', onFocus)
	}, [shown, folderId, refresh])

	useEffect(() => {
		if (folderId === null) return
		setMessages([])
		setSelectedId(null)
		setChecked(new Set())
		refresh(folderId, true)
		const timer = setInterval(() => refresh(folderId, false), REFRESH_MS)
		return () => clearInterval(timer)
	}, [folderId, refresh])

	const loadMore = useCallback(async () => {
		if (folderId === null || loadingMore.current) return
		// pinned ones lead the list and stay out of the paging
		const last = [...messages].reverse().find(m => !m.pinnedAt)
		if (!last) return
		loadingMore.current = true
		setLoading(true)
		try {
			if (!hasMore && hasOlderOnServer) await syncFolder(folderId, true)
			applyPage(await fetchMessages(folderId, last.id), true)
		}
		catch (err) {
			setError(errorMessage(err, 'Failed to load older messages'))
		}
		finally {
			loadingMore.current = false
			setLoading(false)
		}
	}, [folderId, messages, hasMore, hasOlderOnServer, applyPage])

	const onOpened = useCallback((opened: MailMessage) => {
		setMessages(prev => prev.map(m => (m.id === opened.id && !m.seen ? { ...m, seen: true } : m)))
		if (folder && !messages.find(m => m.id === opened.id)?.seen) {
			updateFolder({ ...folder, unreadCount: Math.max(0, folder.unreadCount - 1) })
		}
	}, [folder, messages, updateFolder])

	async function act(action: BatchAction) {
		if (selectedId === null) return
		const id = selectedId
		const index = messages.findIndex(m => m.id === id)
		const leaves = action === 'archive' || action === 'delete'
		if (leaves) {
			// Gone from this folder: the next message (or the previous one) takes its place.
			const next = messages[index + 1] ?? messages[index - 1] ?? null
			setMessages(prev => prev.filter(m => m.id !== id))
			setSelectedId(phone ? null : next?.id ?? null)
		}
		else {
			setMessages(prev => applyAction(prev, action, new Set([id])))
			if (action === 'unread') setSelectedId(null)
		}
		try {
			await batchMessages(action, [id])
		}
		catch (err) {
			setError(errorMessage(err, 'The action failed'))
			if (folderId !== null) refresh(folderId, true)
		}
		reloadAccounts()
	}

	/** One action on several messages (ticked ones, or one row's read dot), the list updated at once. */
	async function bulk(action: BatchAction, ids: string[]) {
		if (ids.length === 0) return
		const idSet = new Set(ids)
		if (action === 'archive' || action === 'delete') {
			setMessages(prev => prev.filter(m => !idSet.has(m.id)))
			if (selectedId !== null && idSet.has(selectedId)) setSelectedId(null)
		}
		else {
			setMessages(prev => applyAction(prev, action, idSet))
		}
		setChecked(prev => new Set([...prev].filter(id => !idSet.has(id) || (action !== 'archive' && action !== 'delete'))))
		try {
			await batchMessages(action, ids)
		}
		catch (err) {
			setError(errorMessage(err, 'The action failed'))
			if (folderId !== null) refresh(folderId, true)
		}
		reloadAccounts()
	}

	const onCheck = (ids: string[], on: boolean) => setChecked(prev => {
		const next = new Set(prev)
		ids.forEach(id => (on ? next.add(id) : next.delete(id)))
		return next
	})
	const tickedIds = messages.filter(m => checked.has(m.id)).map(m => m.id)
	const allTicked = messages.length > 0 && tickedIds.length === messages.length
	// phones: the tick boxes are a mode, entered by a long press on a row, left when none is ticked
	const selecting = !phone || tickedIds.length > 0
	useBackHandler(phone && tickedIds.length > 0, () => setChecked(new Set()))
	// phones: back closes the open message (the list again)
	useBackHandler(phone && selectedId !== null, () => setSelectedId(null))
	const tickAll = () => setChecked(allTicked ? new Set() : new Set(messages.map(m => m.id)))

	async function syncNow(target: MailAccount) {
		setSyncingAccountId(target.id)
		try {
			await syncAccount(target.id)
			await reloadAccounts()
			if (folderId !== null) applyPage(await fetchMessages(folderId), false)
		}
		catch (err) {
			setError(errorMessage(err, 'Sync failed'))
			reloadAccounts()
		}
		finally {
			setSyncingAccountId(null)
		}
	}

	// its mailboxes are managed on its settings page (a page of its own: it runs isolated)
	const manage = () => navigate('/mail/settings')

	if (accounts === null) {
		return <div className="flex-1 flex items-center justify-center text-sm text-steel-400">{error ?? 'Loading…'}</div>
	}

	if (accounts.length === 0) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center gap-4 text-sm text-steel-300 px-6 text-center">
				<p>Read and write your mail here: add a mailbox to start.</p>
				<button type="button" onClick={manage} className={primaryButtonClass}>Add a mailbox</button>
			</div>
		)
	}

	// a new message reopens the one left unsent; a reply or a forward starts afresh (from the mailbox
	// that received the message)
	const composeNew = () => {
		setDraft(d => d?.kind === 'new' ? d : newDraft((account ?? accounts[0]).id))
		setComposing(true)
	}
	const composeFrom = (kind: 'reply' | 'replyAll' | 'forward', message: MailMessage) => {
		const from = accounts.find(a => a.folders.some(f => f.id === message.folderId)) ?? account ?? accounts[0]
		setDraft(draftFrom(kind, message, from))
		setComposing(true)
	}
	const composer = composing && draft && (
		<ComposeView
			accounts={accounts}
			draft={draft}
			onChange={setDraft}
			onClose={() => setComposing(false)}
			onSent={() => {
				setComposing(false)
				setDraft(null)
				setNotice('Message sent')
				setTimeout(() => setNotice(null), 3000)
			}}
		/>
	)

	const reader = selectedId !== null && (
		<MessageView
			messageId={selectedId}
			canArchive={canArchive}
			onAction={act}
			onOpened={onOpened}
			onBack={phone ? () => setSelectedId(null) : undefined}
			onClose={phone ? undefined : () => setSelectedId(null)}
			onCompose={composeFrom}
		/>
	)

	if (phone && composer) {
		return <div className="flex-1 min-h-0 flex">{composer}</div>
	}

	if (phone && reader) {
		return <div className="flex-1 min-h-0 flex">{reader}</div>
	}

	return (
		<div className={`flex-1 min-h-0 flex ${phone ? 'flex-col' : ''}`}>
			{phone && <BottomBar tabs={folderTabs(account ?? accounts[0], folderId, id => setFolderId(id), composeNew)} />}
			{!phone && (
				<aside className="w-64 shrink-0 flex flex-col bg-steel-900 border-r border-steel-700">
					<div className="flex-1 min-h-0 overflow-y-auto py-4">
						<FolderNav
							accounts={accounts}
							selectedFolderId={folderId}
							syncingAccountId={syncingAccountId}
							onSelect={f => setFolderId(f.id)}
							onEdit={manage}
							onSync={syncNow}
							onAdd={manage}
						/>
					</div>
					{/* at the bottom, like the Planner's "New event" */}
					<div className="p-3 shrink-0">
						<button
							type="button"
							onClick={composeNew}
							className="w-full flex items-center justify-center gap-2 px-3 h-9 rounded bg-primary-500 hover:bg-primary-300 text-steel-950 text-sm font-semibold cursor-pointer border-0 transition"
						>
							<FontAwesomeIcon icon={faPen} />
							New message
						</button>
					</div>
				</aside>
			)}

			{/* desktop: writing takes the list's and the reader's place */}
			{composer || (<>
				<section className="flex-1 min-w-0 min-h-0 flex flex-col bg-steel-950">
					<header className={`flex items-center gap-2 ${selecting ? 'pl-2' : 'pl-4'} pr-4 h-12 border-b border-steel-800 shrink-0`}>
						{selecting && <TickBox
							checked={allTicked}
							partial={tickedIds.length > 0 && !allTicked}
							label={allTicked ? 'Untick all' : 'Tick all'}
							onClick={tickAll}
						/>}
						{tickedIds.length > 0 ? (
							<BulkActions
								count={tickedIds.length}
								canArchive={canArchive}
								anyUnread={messages.some(m => checked.has(m.id) && !m.seen)}
								anyUnflagged={messages.some(m => checked.has(m.id) && !m.flagged)}
								anyUnpinned={messages.some(m => checked.has(m.id) && !m.pinnedAt)}
								onAction={action => bulk(action, tickedIds)}
								onClear={() => setChecked(new Set())}
							/>
						) : phone ? (
							<MailboxSwitch
								accounts={accounts}
								shown={account ?? accounts[0]}
								onSwitch={target => {
									// the same folder there (Inbox for Inbox…), else its inbox
									const role = folder?.role ?? 'inbox'
									const next = target.folders.find(f => f.role === role) ?? target.folders.find(f => f.role === 'inbox') ?? target.folders[0]
									if (next) setFolderId(next.id)
								}}
							/>
						) : (
							<h1 className="flex-1 truncate text-sm font-semibold text-white">{folder?.name ?? ''}</h1>
						)}
						{!(phone && tickedIds.length > 0) && <LastChecked syncing={syncing} at={folder?.lastSyncAt ?? null} />}
						{!phone && <button
							type="button"
							onClick={() => folderId !== null && refresh(folderId, false)}
							title="Check for new mail"
							className="size-8 flex items-center justify-center rounded bg-transparent border-0 text-steel-400 hover:text-white cursor-pointer"
						>
							<FontAwesomeIcon icon={faRotate} spin={syncing} />
						</button>}
					</header>
					{error && <div className="px-4 py-2 text-xs text-red-400 border-b border-steel-800 break-words">{error}</div>}
					{notice && <div className="px-4 py-2 text-xs text-product-green border-b border-steel-800">{notice}</div>}
					<MessageList
						messages={messages}
						selectedId={selectedId}
						loading={loading || syncing}
						hasMore={hasMore || hasOlderOnServer}
						onSelect={m => setSelectedId(prev => (prev === m.id ? null : m.id))}
						onLoadMore={loadMore}
						showRecipients={folder?.role === 'sent' || folder?.role === 'drafts'}
						checked={checked}
						onCheck={onCheck}
						touch={phone}
						selecting={selecting}
						onRefresh={phone ? () => { if (folderId !== null) void refresh(folderId, false) } : undefined}
						onToggle={(m, what) => bulk(
							what === 'seen' ? (m.seen ? 'unread' : 'read') : what === 'pinned' ? (m.pinnedAt ? 'unpin' : 'pin') : (m.flagged ? 'unflag' : 'flag'),
							[m.id]
						)}
					/>
				</section>

				{!phone && reader && <ReaderPanel>{reader}</ReaderPanel>}
			</>)}
		</div>
	)
}

const ROLE_ICON: Record<FolderRole, IconDefinition> = {
	inbox: faInbox, sent: faPaperPlane, drafts: faFileLines, trash: faTrashCan, archive: faBoxArchive, spam: faBan
}
const ROLE_ORDER: FolderRole[] = ['inbox', 'drafts', 'sent', 'archive', 'spam', 'trash']
const ROLE_LABEL: Partial<Record<FolderRole, string>> = { inbox: 'Inbox', drafts: 'Drafts', sent: 'Sent', trash: 'Trash', spam: 'Spam', archive: 'Archive' }

/**
 * The phone's bottom bar (one mailbox at a time: the header switches): Inbox, Drafts, the new
 * message button, a slot (the folder open when it is none of those, else Trash), then "+" with
 * every other folder.
 */
function folderTabs(shown: MailAccount, folderId: string | null, open: (id: string) => void, compose: () => void): BottomBarTab[] {
	const byRole = (role: FolderRole) => shown.folders.find(f => f.role === role)
	const tab = (f: MailFolder): BottomBarTab => ({
		key: `folder-${f.id}`,
		label: (f.role && ROLE_LABEL[f.role]) || f.name,
		icon: f.role ? ROLE_ICON[f.role] : faFolder,
		active: f.id === folderId,
		onClick: () => open(f.id),
		dot: f.role === 'inbox' && f.unreadCount > 0
	})
	const inbox = byRole('inbox')
	const drafts = byRole('drafts')
	const current = shown.folders.find(f => f.id === folderId)
	const slot = current && current !== inbox && current !== drafts ? current : byRole('trash')
	const fixed = new Set([inbox?.id, drafts?.id, slot?.id])
	const rank = (f: MailFolder) => f.role ? ROLE_ORDER.indexOf(f.role) : ROLE_ORDER.length

	const tabs: BottomBarTab[] = [
		...(inbox ? [tab(inbox)] : []),
		...(drafts ? [tab(drafts)] : []),
		{ key: 'compose', label: 'New', icon: faPen, active: false, onClick: compose, primary: true },
		...(slot ? [tab(slot)] : [])
	]
	const others = shown.folders
		.filter(f => !fixed.has(f.id))
		.sort((x, y) => rank(x) - rank(y))
		.map(f => ({
			key: `folder-${f.id}`,
			label: f.name,
			count: f.unreadCount,
			icon: f.role ? ROLE_ICON[f.role] : faFolder,
			active: false,
			onClick: () => open(f.id)
		}))
	if (others.length > 0) tabs.push({ key: 'more', label: 'More', icon: faPlus, fixed: true, menu: [{ entries: others }] })
	return tabs
}

/**
 * The phone's header title: the mailbox shown (its provider, its address; the folder is the
 * bottom bar's); a tap lists the mailboxes to switch to (with their unread count).
 */
function MailboxSwitch({ accounts, shown, onSwitch }: {
	accounts: MailAccount[]
	shown: MailAccount
	onSwitch: (account: MailAccount) => void
}) {
	const [open, setOpen] = useState(false)
	useBackHandler(open, () => setOpen(false))
	const several = accounts.length > 1
	const unread = (a: MailAccount) => a.folders.find(f => f.role === 'inbox')?.unreadCount ?? 0
	return (
		<div className="relative flex-1 min-w-0">
			<button
				type="button"
				onClick={() => several && setOpen(!open)}
				className={`max-w-full flex items-center gap-2 min-w-0 p-0 bg-transparent border-0 text-left text-white ${several ? 'cursor-pointer' : 'cursor-default'}`}
			>
				<FontAwesomeIcon icon={PROVIDERS[shown.provider].icon} className="shrink-0 text-sm" style={{ color: PROVIDERS[shown.provider].colour }} />
				<span className="truncate text-sm font-semibold">{shown.email}</span>
				{several && <FontAwesomeIcon icon={faChevronDown} className="shrink-0 text-[10px] text-steel-400" />}
				{several && accounts.some(a => a.id !== shown.id && unread(a) > 0) && <span className="size-1.5 shrink-0 rounded-full bg-product-red" />}
			</button>
			{open && (
				<>
					<button type="button" aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/40 border-0 cursor-default" />
					<div className="absolute left-0 top-full mt-2 z-50 w-[min(20rem,calc(100vw-2rem))] py-2 bg-steel-900 border border-steel-700 rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
						{accounts.map(a => (
							<button
								key={a.id}
								type="button"
								onClick={() => { setOpen(false); if (a.id !== shown.id) onSwitch(a) }}
								className={`w-full flex items-center gap-3 px-4 py-2 text-left border-0 cursor-pointer ${a.id === shown.id ? 'bg-primary-700' : 'bg-transparent'}`}
							>
								<FontAwesomeIcon icon={PROVIDERS[a.provider].icon} className="shrink-0 w-4 text-steel-300" style={{ color: PROVIDERS[a.provider].colour }} />
								<span className="flex-1 min-w-0 flex flex-col">
									<span className={`truncate text-sm ${a.id === shown.id ? 'text-primary-500' : 'text-steel-100'}`}>{a.label}</span>
									<span className="truncate text-[11px] text-steel-500">{a.email}</span>
								</span>
								{unread(a) > 0 && <span className="shrink-0 text-xs text-steel-300 tabular-nums">{unread(a)}</span>}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	)
}

const READER_WIDTH_KEY = 'mail.readerWidth'
/** The list keeps at least this much room beside the reader, which never gets narrower than its own. */
const LIST_MIN_WIDTH = 360
const READER_MIN_WIDTH = 380

function storedReaderWidth(): number | null {
	try {
		const value = Number(sessionStorage.getItem(READER_WIDTH_KEY))
		return Number.isFinite(value) && value > 0 ? value : null
	}
	catch {
		return null
	}
}

/**
 * The opened message, beside the list: a share of the width by default, then the width it was
 * dragged to (its left edge), kept for the session.
 */
function ReaderPanel({ children }: { children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null)
	const [width, setWidth] = useState<number | null>(storedReaderWidth)
	const [dragging, setDragging] = useState(false)
	const drag = useRef<{ id: number, x: number, base: number } | null>(null)

	const bounds = () => {
		const room = ref.current?.parentElement?.clientWidth ?? 1200
		const aside = ref.current?.parentElement?.firstElementChild?.clientWidth ?? 0
		return { min: READER_MIN_WIDTH, max: Math.max(READER_MIN_WIDTH, room - aside - LIST_MIN_WIDTH) }
	}
	const clamp = (w: number) => {
		const { min, max } = bounds()
		return Math.min(max, Math.max(min, w))
	}

	function onPointerDown(e: PointerEvent<HTMLDivElement>) {
		drag.current = { id: e.pointerId, x: e.clientX, base: ref.current?.getBoundingClientRect().width ?? 0 }
		e.currentTarget.setPointerCapture(e.pointerId)
		setDragging(true)
	}
	function onPointerMove(e: PointerEvent<HTMLDivElement>) {
		const d = drag.current
		if (!d || d.id !== e.pointerId) return
		setWidth(clamp(d.base + d.x - e.clientX)) // dragged left: wider
	}
	function onPointerUp(e: PointerEvent<HTMLDivElement>) {
		const d = drag.current
		drag.current = null
		setDragging(false)
		if (!d || d.id !== e.pointerId || width === null) return
		try { sessionStorage.setItem(READER_WIDTH_KEY, String(Math.round(width))) } catch { /* per-viewer convenience only */ }
	}

	return (
		<div
			ref={ref}
			style={width === null ? undefined : { width: clamp(width) }}
			className={`relative shrink-0 min-h-0 flex border-l border-steel-700 ${width === null ? 'w-[38%] min-w-[380px]' : ''}`}
		>
			<div
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize the reader"
				title="Drag to resize"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={() => { drag.current = null; setDragging(false) }}
				className={`absolute -left-1 inset-y-0 z-10 w-2 cursor-ew-resize touch-none transition-colors ${dragging ? 'bg-primary-500/60' : 'hover:bg-primary-500/40'}`}
			/>
			{/* while dragging, the message's iframe must not swallow the pointer */}
			{dragging && <div className="absolute inset-0 z-[5] cursor-ew-resize" />}
			{children}
		</div>
	)
}

/** The header's actions on the ticked messages. */
function BulkActions({ count, canArchive, anyUnread, anyUnflagged, anyUnpinned, onAction, onClear }: {
	count: number
	canArchive: boolean
	anyUnread: boolean
	anyUnflagged: boolean
	anyUnpinned: boolean
	onAction: (action: BatchAction) => void
	onClear: () => void
}) {
	const button = (icon: IconDefinition, label: string, action: BatchAction) => (
		<button
			type="button"
			onClick={() => onAction(action)}
			title={label}
			aria-label={label}
			className="size-8 flex items-center justify-center rounded bg-transparent border-0 text-steel-300 hover:text-white hover:bg-steel-800 cursor-pointer"
		>
			<FontAwesomeIcon icon={icon} className="text-sm" />
		</button>
	)
	return (
		<div className="flex-1 min-w-0 flex items-center gap-1">
			<span className="mr-2 text-sm font-semibold text-white tabular-nums whitespace-nowrap">{count} selected</span>
			{anyUnread ? button(faEnvelopeOpen, 'Mark as read', 'read') : button(faEnvelope, 'Mark as unread', 'unread')}
			{anyUnpinned ? button(faThumbtack, 'Pin to the top', 'pin') : button(faThumbtack, 'Unpin', 'unpin')}
			{anyUnflagged ? button(faStar, 'Add to favourites', 'flag') : button(faStarOutline, 'Remove from favourites', 'unflag')}
			{canArchive && button(faBoxArchive, 'Archive', 'archive')}
			{button(faTrash, 'Delete', 'delete')}
			<span className="flex-1" />
			<button
				type="button"
				onClick={onClear}
				title="Clear the selection"
				aria-label="Clear the selection"
				className="size-8 flex items-center justify-center rounded bg-transparent border-0 text-steel-400 hover:text-white cursor-pointer"
			>
				<FontAwesomeIcon icon={faXmark} />
			</button>
		</div>
	)
}

/**
 * A flag change applied to the list: pinned messages lead it, the latest pinned first, the others
 * keep their order (newest first).
 */
function applyAction(list: MailMessageSummary[], action: BatchAction, ids: ReadonlySet<string>): MailMessageSummary[] {
	const now = new Date().toISOString()
	const next = list.map(m => (!ids.has(m.id) ? m : {
		...m,
		seen: action === 'read' ? true : action === 'unread' ? false : m.seen,
		flagged: action === 'flag' ? true : action === 'unflag' ? false : m.flagged,
		pinnedAt: action === 'pin' ? (m.pinnedAt ?? now) : action === 'unpin' ? null : m.pinnedAt
	}))
	if (action !== 'pin' && action !== 'unpin') return next
	const time = (iso: string | null) => (iso ? Date.parse(iso) : 0)
	const pinned = next.filter(m => m.pinnedAt).sort((a, b) => time(b.pinnedAt) - time(a.pinnedAt))
	const others = next.filter(m => !m.pinnedAt).sort((a, b) => time(b.date) - time(a.date) || (b.id < a.id ? -1 : b.id > a.id ? 1 : 0))
	return [...pinned, ...others]
}

/** When the folder was last checked with the provider (it is again every few minutes while shown). */
function LastChecked({ syncing, at }: { syncing: boolean, at: string | null }) {
	const [now, setNow] = useState(() => Date.now())
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 30_000)
		return () => clearInterval(timer)
	}, [])
	if (!syncing && !at) return null
	return (
		<span
			className={`shrink-0 inline-flex items-center gap-1.5 text-xs ${syncing ? 'text-white' : 'text-steel-500'}`}
			title={at ? new Date(at).toLocaleString('en-GB') : undefined}
		>
			{syncing && <FontAwesomeIcon icon={faRotate} spin className="text-primary-500 text-[11px]" />}
			{syncing ? 'Checking…' : `Updated ${timeAgo(at!, now)}`}
		</span>
	)
}

