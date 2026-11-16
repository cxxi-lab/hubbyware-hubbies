import { useCallback, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faPlus, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { errorMessage } from '@cxxi-lab/hubbyware-sdk'
import { fetchAccounts, type MailAccount } from '../api/mail'
import { AccountModal, PROVIDERS } from '../components/AccountModal'
import { listDate } from '../lib/format'

/** Mail's own settings (Hubbies > Mail): its mailboxes, added, edited and removed here. */
export function MailSettings() {
	const [accounts, setAccounts] = useState<MailAccount[] | null>(null)
	const [error, setError] = useState<string | null>(null)
	/** undefined: closed; null: adding */
	const [editing, setEditing] = useState<MailAccount | null | undefined>(undefined)

	const load = useCallback(() => {
		fetchAccounts()
			.then(data => { setAccounts(data); setError(null) })
			.catch(err => setError(errorMessage(err, 'Failed to load the mailboxes')))
	}, [])
	useEffect(load, [load])

	return (
		<section className="bg-steel-900 border border-steel-700 rounded-md">
			<header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
				<div>
					<h2 className="m-0 text-sm font-semibold text-white uppercase tracking-wider">Mailboxes</h2>
					<p className="mt-1 mb-0 text-xs text-steel-300">Gmail and Microsoft connect through their sign-in, Yahoo and the others with an (app) password.</p>
				</div>
				<button
					type="button"
					onClick={() => setEditing(null)}
					className="shrink-0 flex items-center gap-2 px-3 h-8 rounded bg-primary-500 hover:bg-primary-300 text-steel-950 font-semibold border-0 cursor-pointer text-sm"
				>
					<FontAwesomeIcon icon={faPlus} />
					Add a mailbox
				</button>
			</header>

			{accounts === null ? (
				<p className="m-0 px-5 pb-4 text-sm text-steel-300">{error ?? 'Loading…'}</p>
			) : accounts.length === 0 ? (
				<p className="m-0 px-5 pb-4 text-sm text-steel-300">No mailbox yet.</p>
			) : (
				<ul className="m-0 p-0 list-none">
					{accounts.map(a => (
						<li key={a.id} className="flex items-center gap-3 px-5 py-3 border-t border-steel-800">
							<span className="size-8 shrink-0 flex items-center justify-center rounded bg-steel-800 text-steel-100">
								<FontAwesomeIcon icon={PROVIDERS[a.provider].icon} />
							</span>
							<span className="flex-1 min-w-0">
								<span className="block truncate text-sm text-white">{a.label}{a.label !== a.email && <span className="text-steel-300"> · {a.email}</span>}</span>
								{a.lastError ? (
									<span className="flex items-center gap-1.5 text-xs text-red-400 truncate" title={a.lastError}>
										<FontAwesomeIcon icon={faTriangleExclamation} />
										{a.lastError}
									</span>
								) : (
									<span className="block text-xs text-steel-300">
										{PROVIDERS[a.provider].label}{a.auth === 'oauth' ? ' · connected' : ''}
										{a.lastSyncAt ? ` · synced ${listDate(a.lastSyncAt)}` : ' · not synced yet'}
										{!a.enabled && ' · disabled'}
									</span>
								)}
							</span>
							<button
								type="button"
								onClick={() => setEditing(a)}
								title={`Edit ${a.label}`}
								aria-label={`Edit ${a.label}`}
								className="size-8 shrink-0 flex items-center justify-center rounded border-0 cursor-pointer bg-transparent text-steel-300 hover:text-white hover:bg-steel-700"
							>
								<FontAwesomeIcon icon={faPen} className="text-xs" />
							</button>
						</li>
					))}
				</ul>
			)}

			{editing !== undefined && (
				<AccountModal account={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load() }} />
			)}
		</section>
	)
}
