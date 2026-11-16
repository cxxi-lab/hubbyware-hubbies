import type { MailAccount, MailAddress, MailAttachment, MailMessage } from '../api/mail'
import { fullDate } from './format'

export type ComposeKind = 'new' | 'reply' | 'replyAll' | 'forward'

/** A message being written (kept by the Mail page while closed: reopening finds it again). */
export interface Draft {
	kind: ComposeKind
	accountId: string
	to: string
	cc: string
	bcc: string
	subject: string
	text: string
	replyTo?: string
	forwardOf?: string
	/** a forward's original attachments (sent along by the server) */
	forwarded: MailAttachment[]
	files: File[]
}

export function newDraft(accountId: string): Draft {
	return { kind: 'new', accountId, to: '', cc: '', bcc: '', subject: '', text: '', forwarded: [], files: [] }
}

const list = (addresses: MailAddress[]) => addresses.map(a => a.address).join(', ')
const who = (a: MailAddress | null) => a ? (a.name ? `${a.name} <${a.address}>` : a.address) : 'someone'

function prefixed(prefix: 'Re' | 'Fwd', subject: string | null): string {
	const s = subject?.trim() ?? ''
	return new RegExp(`^${prefix}:`, 'i').test(s) ? s : `${prefix}: ${s}`
}

/** The message's text: its text part, else its HTML's text. */
export function bodyText(message: MailMessage): string {
	if (message.text) return message.text.replace(/\r\n/g, '\n')
	if (!message.html) return ''
	const doc = new DOMParser().parseFromString(message.html, 'text/html')
	doc.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
	doc.querySelectorAll('p, div, tr, li, h1, h2, h3, h4, blockquote').forEach(el => el.append('\n'))
	return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * A reply, a reply to all, or a forward of a message, from the account it was received in.
 * Replies quote it ("> "), a forward carries it whole under a header, and its attachments.
 */
export function draftFrom(kind: Exclude<ComposeKind, 'new'>, message: MailMessage, account: MailAccount): Draft {
	const own = account.email.toLowerCase()
	const text = bodyText(message)
	if (kind === 'forward') {
		return {
			kind, accountId: account.id, to: '', cc: '', bcc: '',
			subject: prefixed('Fwd', message.subject),
			text: [
				'', '',
				'---------- Forwarded message ----------',
				`From: ${who(message.from)}`,
				`Date: ${fullDate(message.date)}`,
				`Subject: ${message.subject ?? ''}`,
				`To: ${list(message.to)}`,
				'', text
			].join('\n'),
			forwardOf: message.id,
			forwarded: message.attachments.filter(a => !a.inline),
			files: []
		}
	}
	const answerTo = message.replyTo.length > 0 ? message.replyTo : message.from ? [message.from] : []
	const others = kind === 'replyAll'
		? [...message.to, ...message.cc].filter(a => a.address.toLowerCase() !== own && !answerTo.some(t => t.address.toLowerCase() === a.address.toLowerCase()))
		: []
	return {
		kind, accountId: account.id,
		to: list(answerTo), cc: list(others), bcc: '',
		subject: prefixed('Re', message.subject),
		text: ['', '', `On ${fullDate(message.date)}, ${who(message.from)} wrote:`, ...text.split('\n').map(l => `> ${l}`)].join('\n'),
		replyTo: message.id,
		forwarded: [],
		files: []
	}
}
