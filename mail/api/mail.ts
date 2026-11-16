import { api, type ListResponse, type SingleResponse } from '@cxxi-lab/hub-sdk'

export type MailProvider = 'yahoo' | 'gmail' | 'microsoft' | 'custom'
/** password (an app password at Yahoo) or OAuth (Gmail, Microsoft) */
export type MailAuth = 'password' | 'oauth'
export type MailEncryption = 'ssl' | 'starttls'
export type FolderRole = 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | 'spam'

export interface MailEndpoints {
	imapHost: string
	imapPort: number
	imapEncryption: MailEncryption
	smtpHost: string
	smtpPort: number
	smtpEncryption: MailEncryption
}

export interface ProviderInfo {
	id: MailProvider
	auth: MailAuth
	/** false: an OAuth provider whose client is not set up on the server */
	configured: boolean
	/** null for custom: every endpoint is typed in */
	preset: MailEndpoints | null
}

export interface MailFolder {
	id: string
	accountId: string
	path: string
	name: string
	delimiter: string | null
	role: FolderRole | null
	unreadCount: number
	totalCount: number
	lastSyncAt: string | null
}

export interface MailAccount extends MailEndpoints {
	id: string
	label: string
	email: string
	displayName: string | null
	provider: MailProvider
	auth: MailAuth
	username: string
	signature: string | null
	appendToSent: boolean
	enabled: boolean
	lastSyncAt: string | null
	lastError: string | null
	folders: MailFolder[]
}

export interface AccountInput extends Partial<MailEndpoints> {
	label: string | null
	email: string
	displayName: string | null
	provider: MailProvider
	username: string | null
	/** required to add an account; when editing, only sent to replace it */
	password: string | null
	signature: string | null
	appendToSent: boolean
	enabled: boolean
}

export interface MailAddress {
	name: string | null
	address: string
}

export interface MailMessageSummary {
	id: string
	folderId: string
	subject: string | null
	from: MailAddress | null
	to: MailAddress[]
	date: string
	snippet: string | null
	seen: boolean
	/** the IMAP \\Flagged flag, shown as a star (favourite) */
	flagged: boolean
	/** pinned in hub: kept at the top of its folder (latest pinned first) */
	pinnedAt: string | null
	answered: boolean
	hasAttachments: boolean
	/** the sender's domain logo (only for senders checked genuine), signed URL */
	senderLogo: string | null
}

export interface MailAttachment {
	/** its MIME part within the message */
	id: string
	filename: string | null
	mimeType: string
	size: number
	inline: boolean
	url: string
}

export interface MailMessage extends MailMessageSummary {
	cc: MailAddress[]
	bcc: MailAddress[]
	replyTo: MailAddress[]
	messageId: string | null
	sentAt: string | null
	/** sanitized; remote images stay remote (blocked) unless fetched with `images` */
	html: string | null
	text: string | null
	remoteImages: boolean
	/** remote images come through the proxy (asked for, or a sender checked genuine) */
	imagesShown: boolean
	attachments: MailAttachment[]
}

export interface MessagePage {
	data: MailMessageSummary[]
	folder: MailFolder
	/** more rows in the local mirror */
	hasMore: boolean
	/** the mirror is exhausted but the server holds older mail (sync with `older`) */
	hasOlderOnServer: boolean
}

export type BatchAction = 'read' | 'unread' | 'flag' | 'unflag' | 'pin' | 'unpin' | 'archive' | 'delete' | 'move'

function json(method: string, body?: unknown): RequestInit {
	return { method, body: body === undefined ? undefined : JSON.stringify(body) }
}

export function fetchProviders() {
	return api<ListResponse<ProviderInfo>>('/api/cap/mail/providers').then(r => r.data)
}

export function fetchAccounts() {
	return api<ListResponse<MailAccount>>('/api/cap/mail/accounts').then(r => r.data)
}

export function createAccount(input: AccountInput) {
	return api<SingleResponse<MailAccount>>('/api/cap/mail/accounts', json('POST', input)).then(r => r.data)
}

export function updateAccount(id: string, input: AccountInput) {
	return api<SingleResponse<Omit<MailAccount, 'folders'>>>(`/api/cap/mail/accounts/${id}`, json('PATCH', input)).then(r => r.data)
}

export function deleteAccount(id: string) {
	return api<{ ok: boolean }>(`/api/cap/mail/accounts/${id}`, json('DELETE'))
}

/** Folder list + Inbox, now. */
/** Starts connecting an OAuth mailbox: the consent page, and the redirect address to catch. */
export function startOAuth(provider: MailProvider) {
	return api<SingleResponse<{ url: string, redirectUri: string }>>(`/api/cap/mail/oauth/${provider}/start`, json('POST')).then(r => r.data)
}

/** Ends it with what the provider sent back: adds the mailbox (or renews the one there). */
export function finishOAuth(provider: MailProvider, code: string, state: string) {
	return api<SingleResponse<MailAccount & { created: boolean }>>(`/api/cap/mail/oauth/${provider}/finish`, json('POST', { code, state })).then(r => r.data)
}

export function syncAccount(id: string) {
	return api<SingleResponse<MailAccount>>(`/api/cap/mail/accounts/${id}/sync`, json('POST')).then(r => r.data)
}

export function fetchMessages(folderId: string, before?: string) {
	const query = before ? `?before=${before}` : ''
	return api<MessagePage>(`/api/cap/mail/folders/${folderId}/messages${query}`)
}

/** Syncs a folder now; `older` also mirrors the next batch of older mail. */
export function syncFolder(folderId: string, older = false) {
	return api<SingleResponse<MailFolder> & { added: number }>(
		`/api/cap/mail/folders/${folderId}/sync${older ? '?older=1' : ''}`,
		json('POST')
	)
}

/** Opening a message marks it read. */
export function fetchMessage(id: string, images = false) {
	return api<SingleResponse<MailMessage>>(`/api/cap/mail/messages/${id}${images ? '?images=1' : ''}`).then(r => r.data)
}

export function batchMessages(action: BatchAction, ids: string[], folderId?: string) {
	return api<{ ok: boolean }>('/api/cap/mail/messages/batch', json('POST', { action, ids, folderId }))
}

/** What a message sends: `replyTo` or `forwardOf` (a message's id) thread it or bring its attachments. */
export interface Outgoing {
	accountId: string
	to: string
	cc: string
	bcc: string
	subject: string
	text: string
	replyTo?: string
	forwardOf?: string
	files: File[]
}

export function sendMessage(message: Outgoing) {
	const form = new FormData()
	for (const [key, value] of Object.entries(message)) {
		if (key === 'files' || value === undefined) continue
		form.append(key, String(value))
	}
	for (const file of message.files) form.append('files[]', file, file.name)
	return api<SingleResponse<{ sent: boolean }>>('/api/cap/mail/send', { method: 'POST', body: form })
}
