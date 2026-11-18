import { storage } from '@cxxi-lab/hubbyware-sdk'
import { useState } from 'react'
import { faChevronDown, faChevronRight, faGear, faPlus, faRotate, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { MailAccount, MailFolder } from '../api/mail'
import { folderIcon } from '../lib/format'

interface Props {
	accounts: MailAccount[]
	selectedFolderId: string | null
	syncingAccountId: string | null
	onSelect: (folder: MailFolder) => void
	onEdit: (account: MailAccount) => void
	onSync: (account: MailAccount) => void
	onAdd: () => void
}

const folderClass = (active: boolean) => [
	'w-full flex items-center gap-2.5 relative py-2 pl-6 pr-4 text-sm/[1] text-left border-0 cursor-pointer transition',
	active
		? 'text-primary-500 bg-primary-700 before:absolute before:bg-primary-500 before:w-1 before:left-0 before:inset-y-0'
		: 'text-steel-100 bg-transparent hover:text-white hover:bg-steel-700'
].join(' ')

function depth(folder: MailFolder): number {
	return folder.delimiter ? folder.path.split(folder.delimiter).length - 1 : 0
}

/** Accounts, each with its folders and their unread counts. */
export function FolderNav({ accounts, selectedFolderId, syncingAccountId, onSelect, onEdit, onSync, onAdd }: Props) {
	return (
		<nav className="flex flex-col gap-4">
			{accounts.map(account => (
				<section key={account.id} className="flex flex-col">
					<header className="group flex items-center gap-1 pl-6 pr-2 pb-1.5">
						<h2 className="flex-1 truncate text-[10px] uppercase tracking-[1.5px] text-steel-500" title={account.email}>
							{account.label}
						</h2>
						{account.lastError && (
							<FontAwesomeIcon icon={faTriangleExclamation} className="text-product-yellow text-xs" title={account.lastError} />
						)}
						<button
							type="button"
							onClick={() => onSync(account)}
							title="Sync now"
							className="size-6 flex items-center justify-center rounded bg-transparent border-0 text-steel-500 hover:text-white cursor-pointer"
						>
							<FontAwesomeIcon icon={faRotate} spin={syncingAccountId === account.id} className="text-xs" />
						</button>
						<button
							type="button"
							onClick={() => onEdit(account)}
							title="Mailbox settings"
							className="size-6 flex items-center justify-center rounded bg-transparent border-0 text-steel-500 hover:text-white cursor-pointer"
						>
							<FontAwesomeIcon icon={faGear} className="text-xs" />
						</button>
					</header>
					<FolderButtons folders={account.folders.filter(f => f.role !== null)} selectedFolderId={selectedFolderId} onSelect={onSelect} />
					<CustomFolders account={account} selectedFolderId={selectedFolderId} onSelect={onSelect} />
				</section>
			))}
			<button
				type="button"
				onClick={onAdd}
				className="mx-6 flex items-center gap-2 text-xs text-white hover:text-primary-500 bg-transparent border-0 cursor-pointer p-0"
			>
				<FontAwesomeIcon icon={faPlus} />
				Add a mailbox
			</button>
		</nav>
	)
}

function FolderButtons({ folders, selectedFolderId, onSelect, indent = 0 }: {
	folders: MailFolder[]
	selectedFolderId: string | null
	onSelect: (folder: MailFolder) => void
	indent?: number
}) {
	return folders.map(folder => (
		<button
			key={folder.id}
			type="button"
			onClick={() => onSelect(folder)}
			className={folderClass(folder.id === selectedFolderId)}
			// Subfolders (e.g. "Archive/2024") indent under their parent.
			style={{ paddingLeft: 24 + (indent + depth(folder)) * 14 }}
		>
			<FontAwesomeIcon icon={folderIcon(folder.role)} className="w-4 text-xs opacity-70" />
			<span className="flex-1 truncate">{folder.name}</span>
			{folder.unreadCount > 0 && folder.role !== 'trash' && folder.role !== 'spam' && (
				<span className="text-xs text-steel-300">{folder.unreadCount}</span>
			)}
		</button>
	))
}

const openKey = (accountId: string) => `mail.customFolders.${accountId}`

/** The user's own folders, folded under one line until unfolded (remembered per mailbox). */
function CustomFolders({ account, selectedFolderId, onSelect }: {
	account: MailAccount
	selectedFolderId: string | null
	onSelect: (folder: MailFolder) => void
}) {
	const folders = account.folders.filter(f => f.role === null)
	const [open, setOpen] = useState(() => {
		return storage.getItem(openKey(account.id)) === '1'
	})
	if (folders.length === 0) return null

	// a folder of its own picked from elsewhere stays in sight
	const shown = open || folders.some(f => f.id === selectedFolderId)
	const unread = folders.reduce((n, f) => n + f.unreadCount, 0)
	const toggle = () => {
		const next = !shown
		setOpen(next)
		storage.setItem(openKey(account.id), next ? '1' : '0')
	}

	return (
		<>
			<button
				type="button"
				onClick={toggle}
				aria-expanded={shown}
				className="w-full flex items-center gap-2.5 py-2 pl-6 pr-4 text-sm/[1] text-left border-0 cursor-pointer bg-transparent text-steel-300 hover:text-white hover:bg-steel-700 transition"
			>
				<FontAwesomeIcon icon={shown ? faChevronDown : faChevronRight} className="w-4 text-[10px] opacity-70" />
				<span className="flex-1 truncate">Folders <span className="text-steel-500">· {folders.length}</span></span>
				{!shown && unread > 0 && <span className="text-xs text-steel-300">{unread}</span>}
			</button>
			{shown && <FolderButtons folders={folders} selectedFolderId={selectedFolderId} onSelect={onSelect} indent={1} />}
		</>
	)
}

