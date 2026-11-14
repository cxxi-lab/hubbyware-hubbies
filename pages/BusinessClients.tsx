import { useCallback, useEffect, useState } from 'react'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { errorMessage } from '@cxxi-lab/hub-sdk'
import { fetchClients, type Client } from '../api/business'
import { ClientModal } from '../components/ClientModal'
import { countryName, primaryButtonClass } from '../components/fields'

interface ModalState {
	client: Client | null
}

const ZONE_LABELS = { fr: 'FR', eu: 'EU', non_eu: 'Non-EU' } as const

export function BusinessClients() {
	const [clients, setClients] = useState<Client[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [modal, setModal] = useState<ModalState | null>(null)

	const reload = useCallback(() => {
		setLoading(true)
		fetchClients()
			.then(data => { setClients(data); setError(null) })
			.catch(err => setError(errorMessage(err, 'Failed to load')))
			.finally(() => setLoading(false))
	}, [])

	useEffect(() => { reload() }, [reload])

	return (
		<div className="flex-1 min-h-0 flex flex-col bg-steel-950">
			<header className="flex items-center justify-between gap-3 px-6 max-sm:px-4 py-4 border-b border-steel-800">
				<h1 className="text-lg font-semibold text-white">Clients</h1>
				<button type="button" onClick={() => setModal({ client: null })} className={primaryButtonClass}>
					<FontAwesomeIcon icon={faPlus} />
					New client
				</button>
			</header>

			<div className="flex-1 min-h-0 overflow-y-auto p-6">
				{loading && clients.length === 0 ? (
					<div className="text-sm text-steel-400">Loading…</div>
				) : error ? (
					<div className="text-sm text-red-400">{error}</div>
				) : clients.length === 0 ? (
					<div className="text-sm text-steel-400 italic">No clients yet.</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
						{clients.map(c => (
							<article
								key={c.id}
								onClick={() => setModal({ client: c })}
								className="bg-steel-900 border border-steel-800 hover:border-steel-600 rounded-lg p-4 flex flex-col gap-2 cursor-pointer"
							>
								<header className="flex items-start justify-between gap-2">
									<div className="min-w-0">
										<h2 className="text-sm font-semibold text-steel-100 break-words">{c.label}</h2>
										<div className="text-xs text-steel-400 break-words">{c.name}</div>
									</div>
									<span className="shrink-0 px-2 py-0.5 rounded border border-steel-700 text-[10px] text-steel-400">
										VAT {ZONE_LABELS[c.vatZone]}
									</span>
								</header>
								<div className="text-xs text-steel-400">
									{[c.zipcode, c.city].filter(Boolean).join(' ')}{c.city || c.zipcode ? ', ' : ''}{countryName(c.country)}
								</div>
								<dl className="flex items-center gap-4 text-xs text-steel-400 mt-auto pt-2 border-t border-steel-800">
									<div><span className="text-steel-500">SIREN</span> {c.siren ?? (c.vatZone === 'fr' ? <span className="text-amber-400">missing</span> : '—')}</div>
									<div><span className="text-steel-500">Invoices</span> {c.invoiceCount}</div>
								</dl>
							</article>
						))}
					</div>
				)}
			</div>

			{modal && <ClientModal client={modal.client} onClose={() => setModal(null)} onSaved={reload} />}
		</div>
	)
}
