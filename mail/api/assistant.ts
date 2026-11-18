import { fetchAccounts, fetchMessage, fetchMessages, sendMessage, type FolderRole, type MailAccount, type MailMessageSummary } from './mail'

// Mail's API for the other hubbies and an assistant (api.json): reading the mailboxes, sending.

const TEXT_CHARS = 20_000
const ROLES: FolderRole[] = ['inbox', 'sent', 'drafts', 'trash', 'archive', 'spam']

const summary = (m: MailMessageSummary) => ({ id: m.id, subject: m.subject, from: m.from, date: m.date, snippet: m.snippet, seen: m.seen, flagged: m.flagged, hasAttachments: m.hasAttachments })

async function account(which: string | undefined, accounts?: MailAccount[]): Promise<MailAccount> {
	const all = (accounts ?? await fetchAccounts()).filter(a => a.enabled)
	if (!all.length) throw new Error('no mailbox is set up in Mail')
	if (!which) return all[0]
	const found = all.find(a => a.id === which || a.email.toLowerCase() === which.trim().toLowerCase())
	if (!found) throw new Error(`no mailbox "${which}" (mail.accounts gives them)`)
	return found
}

function plainText(html: string): string {
	const doc = new DOMParser().parseFromString(html, 'text/html')
	doc.querySelectorAll('script, style').forEach(e => e.remove())
	doc.querySelectorAll('br').forEach(e => e.replaceWith('\n'))
	doc.querySelectorAll('p, div, li, tr, h1, h2, h3, h4').forEach(e => e.append('\n'))
	return (doc.body.textContent ?? '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

export const mailApi = {
	'mail.accounts': async () => (await fetchAccounts()).map(a => ({
		id: a.id, label: a.label, email: a.email,
		folders: a.folders.map(f => ({ id: f.id, name: f.name, role: f.role, unread: f.unreadCount, total: f.totalCount }))
	})),
	'mail.messages': async ({ folder, account: which, limit = 20, unreadOnly = false }: { folder?: string, account?: string, limit?: number, unreadOnly?: boolean }) => {
		const accounts = await fetchAccounts()
		let folderId: string
		if (folder && !ROLES.includes(folder as FolderRole)) {
			if (!accounts.some(a => a.folders.some(f => f.id === folder))) throw new Error(`no folder "${folder}" (mail.accounts gives them)`)
			folderId = folder
		}
		else {
			const box = await account(which, accounts)
			const role = (folder ?? 'inbox') as FolderRole
			const found = box.folders.find(f => f.role === role)
			if (!found) throw new Error(`${box.email} has no ${role} folder`)
			folderId = found.id
		}
		const page = await fetchMessages(folderId)
		return page.data.filter(m => !unreadOnly || !m.seen).slice(0, Math.min(50, Math.max(1, limit))).map(summary)
	},
	'mail.read': async ({ id }: { id: string }) => {
		const m = await fetchMessage(id)
		let text = m.text?.trim() || (m.html ? plainText(m.html) : '')
		if (text.length > TEXT_CHARS) text = `${text.slice(0, TEXT_CHARS)}… [cut]`
		return { ...summary(m), to: m.to, cc: m.cc, text, attachments: m.attachments.filter(a => !a.inline).map(a => a.filename ?? a.mimeType) }
	},
	'mail.send': async ({ to, cc, subject, text, account: which, replyTo }: { to: string, cc?: string, subject: string, text: string, account?: string, replyTo?: string }) => {
		const box = await account(which)
		await sendMessage({ accountId: box.id, to, cc: cc ?? '', bcc: '', subject, text, ...(replyTo ? { replyTo } : {}), files: [] })
		return { sent: true, from: box.email }
	}
}
