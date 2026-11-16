import { useCallback, useEffect, useState } from 'react'
import { faCopy, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { errorMessage } from '@cxxi-lab/hub-sdk'
import { duplicateInvoice, fetchInvoices, type InvoiceSummary } from '../api/business'
import { Money } from '../components/Money'
import { InvoiceModal } from '../components/InvoiceModal'
import { primaryButtonClass } from '../components/fields'

interface ModalState {
	invoiceId: string | null
}

const formatDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR') : '—')

function StatusBadge({ invoice }: { invoice: InvoiceSummary }) {
	const [label, cls] = invoice.status === 'draft'
		? ['Draft', 'text-steel-300 border-steel-600']
		: invoice.paidAt
			? ['Paid', 'text-emerald-400 border-emerald-400/40']
			: ['Issued', 'text-primary-500 border-primary-500/40']
	return <span className={`inline-block px-2 py-0.5 rounded border text-[11px] ${cls}`}>{label}</span>
}

export function BusinessInvoices() {
	const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [modal, setModal] = useState<ModalState | null>(null)

	const reload = useCallback(() => {
		setLoading(true)
		fetchInvoices()
			.then(data => { setInvoices(data); setError(null) })
			.catch(err => setError(errorMessage(err, 'Failed to load')))
			.finally(() => setLoading(false))
	}, [])

	useEffect(() => { reload() }, [reload])

	async function handleDuplicate(invoice: InvoiceSummary) {
		try {
			const copy = await duplicateInvoice(invoice.id)
			reload()
			setModal({ invoiceId: copy.id })
		} catch (err) {
			setError(errorMessage(err, 'Failed to duplicate'))
		}
	}

	return (
		<div className="flex-1 min-h-0 flex flex-col bg-steel-950">
			<header className="flex items-center justify-between gap-3 px-6 max-sm:px-4 py-4 border-b border-steel-800">
				<h1 className="text-lg font-semibold text-white">Invoices</h1>
				<button type="button" onClick={() => setModal({ invoiceId: null })} className={primaryButtonClass}>
					<FontAwesomeIcon icon={faPlus} />
					New invoice
				</button>
			</header>

			<div className="flex-1 min-h-0 overflow-y-auto p-6">
				{loading && invoices.length === 0 ? (
					<div className="text-sm text-steel-400">Loading…</div>
				) : error ? (
					<div className="text-sm text-red-400">{error}</div>
				) : invoices.length === 0 ? (
					<div className="text-sm text-steel-400 italic">No invoices yet.</div>
				) : (
					<table className="w-full text-sm border-collapse">
						<thead>
							<tr className="text-left text-[10px] uppercase tracking-[1.5px] text-steel-500 border-b border-steel-800">
								<th className="font-normal py-2 pr-3">Number</th>
								<th className="font-normal py-2 pr-3">Status</th>
								<th className="font-normal py-2 pr-3">Client</th>
								<th className="font-normal py-2 pr-3">Issued</th>
								<th className="font-normal py-2 pr-3">Due</th>
								<th className="font-normal py-2 pr-3 text-right">Total HT</th>
								<th className="font-normal py-2 pr-3 text-right">Total TTC</th>
								<th className="py-2" />
							</tr>
						</thead>
						<tbody>
							{invoices.map(inv => (
								<tr
									key={inv.id}
									onClick={() => setModal({ invoiceId: inv.id })}
									className="border-b border-steel-800/60 hover:bg-steel-900 cursor-pointer text-steel-200"
								>
									<td className="py-2 pr-3 font-mono">{inv.number ?? <span className="text-steel-500 italic font-sans">draft</span>}</td>
									<td className="py-2 pr-3"><StatusBadge invoice={inv} /></td>
									<td className="py-2 pr-3">
										<span className="text-steel-100">{inv.client.label}</span>
										<span className="text-steel-500"> · {inv.client.name}</span>
									</td>
									<td className="py-2 pr-3">{formatDate(inv.issueDate)}</td>
									<td className="py-2 pr-3">{formatDate(inv.dueDate)}</td>
									<td className="py-2 pr-3 text-right tabular-nums"><Money cents={inv.netTotalHt} /></td>
									<td className="py-2 pr-3 text-right tabular-nums text-white"><Money cents={inv.totalTtc} /></td>
									<td className="py-2 text-right">
										<button
											type="button"
											onClick={e => { e.stopPropagation(); handleDuplicate(inv) }}
											title="Duplicate as new draft"
											className="w-7 h-7 inline-flex items-center justify-center rounded text-steel-300 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer"
										>
											<FontAwesomeIcon icon={faCopy} className="text-xs" />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{modal && (
				<InvoiceModal invoiceId={modal.invoiceId} onClose={() => setModal(null)} onSaved={reload} />
			)}
		</div>
	)
}
