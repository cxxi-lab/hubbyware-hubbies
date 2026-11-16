import type { FolderRole, MailAddress } from '../api/mail'
import {
	faBoxArchive, faFile, faFolder, faInbox, faPaperPlane, faTrash, faTriangleExclamation, type IconDefinition
} from '@fortawesome/free-solid-svg-icons'

/** List date, always with the time: the time alone today, then day + month (+ year before this one). */
export function listDate(iso: string): string {
	const date = new Date(iso)
	const now = new Date()
	const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
	if (date.toDateString() === now.toDateString()) return time
	const day = date.getFullYear() === now.getFullYear()
		? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
		: date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
	return `${day}, ${time}`
}

/** Initials of a sender, for its round badge: "Lucas Rivoire" → LR, "service@paypal.fr" → SE. */
export function initials(address: MailAddress | null): string {
	const name = (address?.name || address?.address.split('@')[0] || '?').replace(/["'()<>]/g, ' ').trim()
	const words = name.split(/[\s._-]+/).filter(w => /\p{L}|\d/u.test(w))
	const letters = words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)
	return letters.toUpperCase()
}

/** A steady colour for a sender's badge (same sender, same colour), from the Flat UI palette. */
const BADGE_COLOURS = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#f1c40f', '#e67e22', '#e74c3c', '#d35400', '#c0392b', '#f39c12']
export function badgeColour(address: MailAddress | null): string {
	const key = (address?.address || address?.name || '').toLowerCase()
	let hash = 0
	for (const c of key) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
	return BADGE_COLOURS[hash % BADGE_COLOURS.length]
}

export function fullDate(iso: string): string {
	return new Date(iso).toLocaleString('en-GB', {
		weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
	})
}

export function addressLabel(address: MailAddress | null): string {
	if (!address) return '(unknown sender)'
	return address.name || address.address
}

export function addressList(addresses: MailAddress[]): string {
	return addresses.map(a => (a.name ? `${a.name} <${a.address}>` : a.address)).join(', ')
}

export function fileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const ROLE_ICONS: Record<FolderRole, IconDefinition> = {
	inbox: faInbox, sent: faPaperPlane, drafts: faFile, trash: faTrash, archive: faBoxArchive, spam: faTriangleExclamation
}

export function folderIcon(role: FolderRole | null): IconDefinition {
	return role ? ROLE_ICONS[role] : faFolder
}

/** How long ago, short: "just now", "5 min ago", "3 h ago", "2 d ago". */
export function timeAgo(iso: string, now = Date.now()): string {
	const minutes = Math.floor((now - Date.parse(iso)) / 60000)
	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes} min ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours} h ago`
	return `${Math.floor(hours / 24)} d ago`
}
