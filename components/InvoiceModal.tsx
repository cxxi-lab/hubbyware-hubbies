import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { faArrowDown, faArrowUp, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { errorMessage } from '@cxxi-lab/hub-sdk'
import { Money } from './Money'
import {
	createInvoice,
	deleteInvoice,
	fetchBankAccounts,
	fetchClients,
	fetchInvoice,
	fetchSettings,
	fetchVatDefaults,
	updateInvoice,
	type BankAccount,
	type Client,
	type InvoiceInput,
	type InvoiceLineInput,
	type OperationCategory,
	type VatDefaults
} from '../api/business'
import {
	centsToInput,
	formatRate,
	lineTotals,
	parseAmount,
	parseRate,
	quantityToMilli,
	rateToInput
} from '../lib/money'
import { ModalShell } from './ModalShell'
import {
	Field,
	SectionTitle,
	dangerButtonClass,
	inputClass,
	nullable,
	primaryButtonClass,
	secondaryButtonClass,
	textareaClass
} from './fields'

interface Props {
	invoiceId: string | null
	onClose: () => void
	onSaved: () => void
}

/** Form row: raw strings while typing, parsed on save. vatRate '' = VAT default. */
interface LineRow {
	key: string
	title: string
	description: string
	quantity: string
	unit: string
	unitPrice: string
	vatRate: string
	discountRate: string
}

const OPERATION_CATEGORIES: { value: OperationCategory; label: string }[] = [
	{ value: 'services', label: 'Services' },
	{ value: 'goods', label: 'Goods' },
	{ value: 'mixed', label: 'Mixed' }
]

const ZONE_LABELS = { fr: 'France', eu: 'EU', non_eu: 'Outside EU' } as const

let rowSeq = 0
const newRow = (): LineRow => ({
	key: `line-${++rowSeq}`,
	title: '',
	description: '',
	quantity: '1',
	unit: '',
	unitPrice: '',
	vatRate: '',
	discountRate: ''
})

const today = () => new Date().toISOString().slice(0, 10)

export function InvoiceModal({ invoiceId, onClose, onSaved }: Props) {
	const [clients, setClients] = useState<Client[]>([])
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
	const [defaults, setDefaults] = useState<VatDefaults | null>(null)

	const [clientId, setClientId] = useState<string | null>(null)
	const [issueDate, setIssueDate] = useState(today())
	const [dueDate, setDueDate] = useState('')
	const [performanceStart, setPerformanceStart] = useState('')
	const [performanceEnd, setPerformanceEnd] = useState('')
	const [category, setCategory] = useState<OperationCategory>('services')
	// null = follow the VAT default mention
	const [vatMention, setVatMention] = useState<string | null>(null)
	const [bankAccountId, setBankAccountId] = useState<string | null>(null)
	const [notes, setNotes] = useState('')
	const [lines, setLines] = useState<LineRow[]>([newRow()])
	const [readOnly, setReadOnly] = useState(false)
	const [number, setNumber] = useState<string | null>(null)

	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	// stored mention of an edited invoice, folded back to "default" once defaults are known
	const pendingMention = useRef<string | null | undefined>(undefined)

	useEffect(() => {
		Promise.all([fetchClients(), fetchBankAccounts(), fetchSettings(), invoiceId ? fetchInvoice(invoiceId) : null])
			.then(([clients, accounts, settings, invoice]) => {
				setClients(clients)
				setBankAccounts(accounts)
				if (invoice) {
					setClientId(invoice.client.id)
					setIssueDate(invoice.issueDate ?? '')
					setDueDate(invoice.dueDate ?? '')
					setPerformanceStart(invoice.performanceStartDate ?? '')
					setPerformanceEnd(invoice.performanceEndDate ?? '')
					setCategory(invoice.operationCategory)
					setVatMention(invoice.vatMention ?? '')
					pendingMention.current = invoice.vatMention
					setBankAccountId(invoice.bankAccountId)
					setNotes(invoice.notes ?? '')
					setReadOnly(invoice.status !== 'draft')
					setNumber(invoice.number)
					setLines(invoice.lines.map(l => ({
						key: `line-${++rowSeq}`,
						title: l.title,
						description: l.description ?? '',
						quantity: l.quantity,
						unit: l.unit ?? '',
						unitPrice: centsToInput(l.unitPrice),
						vatRate: rateToInput(l.vatRate),
						discountRate: l.discountRate ? rateToInput(l.discountRate) : ''
					})))
				} else {
					setClientId(clients[0]?.id ?? null)
					setBankAccountId(settings.defaultBankAccountId)
				}
			})
			.catch(err => setError(errorMessage(err, 'Failed to load')))
			.finally(() => setLoading(false))
	}, [invoiceId])

	useEffect(() => {
		if (clientId === null) return
		fetchVatDefaults(clientId, category)
			.then(d => {
				setDefaults(d)
				if (pendingMention.current !== undefined) {
					if (pendingMention.current === d.vatMention) setVatMention(null)
					pendingMention.current = undefined
				}
			})
			.catch(err => setError(errorMessage(err, 'Failed to load VAT defaults')))
	}, [clientId, category])

	const defaultRate = defaults?.vatRate ?? 0

	const computed = useMemo(() => {
		let gross = 0, net = 0, vat = 0
		const perLine = lines.map(row => {
			const qty = quantityToMilli(row.quantity)
			const price = parseAmount(row.unitPrice)
			const rate = row.vatRate.trim() === '' ? defaultRate : parseRate(row.vatRate)
			const discount = row.discountRate.trim() === '' ? 0 : parseRate(row.discountRate)
			if (qty === null || price === null || rate === null || discount === null) return null
			const t = lineTotals(qty, price, rate, discount)
			gross += t.gross
			net += t.net
			vat += t.vat
			return t
		})
		return { perLine, gross, net, vat, ttc: net + vat }
	}, [lines, defaultRate])

	function updateRow(key: string, patch: Partial<LineRow>) {
		setLines(rows => rows.map(r => r.key === key ? { ...r, ...patch } : r))
	}
	function moveRow(key: string, delta: -1 | 1) {
		setLines(rows => {
			const i = rows.findIndex(r => r.key === key)
			const j = i + delta
			if (i < 0 || j < 0 || j >= rows.length) return rows
			const next = [...rows]
			;[next[i], next[j]] = [next[j], next[i]]
			return next
		})
	}

	function buildPayload(): InvoiceInput | string {
		if (clientId === null) return 'Pick a client'
		const filled = lines.filter(r => r.title.trim() || r.unitPrice.trim())
		if (filled.length === 0) return 'Add at least one line'

		const payloadLines: InvoiceLineInput[] = []
		for (const [idx, row] of filled.entries()) {
			const unitPrice = parseAmount(row.unitPrice)
			const vatRate = row.vatRate.trim() === '' ? null : parseRate(row.vatRate)
			const discountRate = row.discountRate.trim() === '' ? 0 : parseRate(row.discountRate)
			if (!row.title.trim()) return `Line ${idx + 1}: title is required`
			if (quantityToMilli(row.quantity) === null) return `Line ${idx + 1}: invalid quantity`
			if (unitPrice === null) return `Line ${idx + 1}: invalid unit price`
			if (row.vatRate.trim() !== '' && vatRate === null) return `Line ${idx + 1}: invalid VAT rate`
			if (discountRate === null) return `Line ${idx + 1}: invalid discount`
			payloadLines.push({
				title: row.title.trim(),
				description: nullable(row.description),
				quantity: row.quantity.trim().replace(',', '.'),
				unit: nullable(row.unit),
				unitPrice,
				vatRate,
				discountRate
			})
		}

		return {
			clientId,
			issueDate: issueDate || null,
			dueDate: dueDate || null,
			performanceStartDate: performanceStart || null,
			performanceEndDate: performanceEnd || null,
			operationCategory: category,
			vatMention: vatMention === null ? null : vatMention.trim(),
			bankAccountId,
			notes: nullable(notes),
			lines: payloadLines
		}
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (readOnly) return
		const payload = buildPayload()
		if (typeof payload === 'string') {
			setError(payload)
			return
		}
		setSaving(true)
		setError(null)
		try {
			if (invoiceId) await updateInvoice(invoiceId, payload)
			else await createInvoice(payload)
			onSaved()
			onClose()
		} catch (err) {
			setError(errorMessage(err, 'Failed to save'))
		} finally {
			setSaving(false)
		}
	}

	async function handleDelete() {
		if (!invoiceId) return
		setSaving(true)
		try {
			await deleteInvoice(invoiceId)
			onSaved()
			onClose()
		} catch (err) {
			setError(errorMessage(err, 'Failed to delete'))
		} finally {
			setSaving(false)
		}
	}

	const title = invoiceId ? (number ? `Invoice ${number}` : 'Edit draft invoice') : 'New invoice'

	return (
		<ModalShell
			title={title}
			width="sm:max-w-5xl"
			onClose={onClose}
			onSubmit={handleSubmit}
			footer={
				<>
					{invoiceId && !readOnly ? (
						<button type="button" onClick={handleDelete} disabled={saving} className={dangerButtonClass}>
							<FontAwesomeIcon icon={faTrash} />
							Delete draft
						</button>
					) : <div />}
					<div className="flex items-center gap-2">
						<button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>
							{readOnly ? 'Close' : 'Cancel'}
						</button>
						{!readOnly && (
							<button type="submit" disabled={saving || loading} className={primaryButtonClass}>
								{saving ? 'Saving…' : 'Save draft'}
							</button>
						)}
					</div>
				</>
			}
		>
			{loading ? (
				<div className="text-sm text-steel-400">Loading…</div>
			) : clients.length === 0 ? (
				<div className="text-sm text-steel-400 italic">Create a client first.</div>
			) : (
				<fieldset disabled={readOnly} className="flex flex-col gap-4 border-0 p-0 m-0 min-w-0">
					{readOnly && (
						<div className="text-xs text-amber-400">Issued invoices are immutable — corrections go through a credit note.</div>
					)}

					<div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr] gap-3">
						<Field label="Client">
							<select value={clientId ?? ''} onChange={e => setClientId(e.target.value)} className={inputClass}>
								{clients.map(c => <option key={c.id} value={c.id}>{c.label} — {c.name}</option>)}
							</select>
						</Field>
						<Field label="Operation">
							<select value={category} onChange={e => setCategory(e.target.value as OperationCategory)} className={inputClass}>
								{OPERATION_CATEGORIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</Field>
						<Field label="Issue date">
							<input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputClass} />
						</Field>
						<Field label="Due date" hint={dueDate ? undefined : 'Auto: issue date + payment terms'}>
							<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
						</Field>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr] gap-3">
						<Field label="Performance start">
							<input type="date" value={performanceStart} onChange={e => setPerformanceStart(e.target.value)} className={inputClass} />
						</Field>
						<Field label="Performance end">
							<input type="date" value={performanceEnd} onChange={e => setPerformanceEnd(e.target.value)} className={inputClass} />
						</Field>
						<Field label="Bank account">
							<select
								value={bankAccountId ?? ''}
								onChange={e => setBankAccountId(e.target.value === '' ? null : e.target.value)}
								className={inputClass}
							>
								<option value="">—</option>
								{bankAccounts.map(a => <option key={a.id} value={a.id}>{a.label} — {a.iban}</option>)}
							</select>
						</Field>
					</div>

					<section className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<SectionTitle>Lines</SectionTitle>
							{defaults && (
								<span className="text-[11px] text-steel-500">
									Default VAT {formatRate(defaults.vatRate)} · {defaults.vatRegime} · client {ZONE_LABELS[defaults.vatZone]}
								</span>
							)}
						</div>
						{/* the lines: a fixed grid, scrolled sideways on a narrow screen */}
						<div className="overflow-x-auto -mx-1 px-1 pretty-scrollbar">
						<div className="min-w-[660px] flex flex-col gap-2">
						<div className="grid grid-cols-[1fr_70px_60px_100px_70px_70px_100px_auto] gap-2 text-[10px] uppercase tracking-wide text-steel-500 px-2">
							<span>Title</span><span>Qty</span><span>Unit</span><span>Unit price</span><span>VAT %</span><span>Disc. %</span><span className="text-right">Total HT</span><span />
						</div>
						{lines.map((row, idx) => (
							<div key={row.key} className="flex flex-col gap-1 bg-steel-900/40 border border-steel-800 rounded p-2">
								<div className="grid grid-cols-[1fr_70px_60px_100px_70px_70px_100px_auto] gap-2 items-center">
									<input type="text" value={row.title} onChange={e => updateRow(row.key, { title: e.target.value })} placeholder="Title" className={inputClass} />
									<input type="text" value={row.quantity} onChange={e => updateRow(row.key, { quantity: e.target.value })} className={inputClass} />
									<input type="text" value={row.unit} onChange={e => updateRow(row.key, { unit: e.target.value })} placeholder="day" className={inputClass} />
									<input type="text" value={row.unitPrice} onChange={e => updateRow(row.key, { unitPrice: e.target.value })} placeholder="0.00" className={`${inputClass} text-right`} />
									<input type="text" value={row.vatRate} onChange={e => updateRow(row.key, { vatRate: e.target.value })} placeholder={rateToInput(defaultRate)} className={`${inputClass} text-right`} />
									<input type="text" value={row.discountRate} onChange={e => updateRow(row.key, { discountRate: e.target.value })} placeholder="0" className={`${inputClass} text-right`} />
									<span className="text-sm text-right text-steel-200 tabular-nums">
										{computed.perLine[idx] ? <Money cents={computed.perLine[idx].net} /> : '—'}
									</span>
									<div className="flex items-center gap-1">
										<button type="button" onClick={() => moveRow(row.key, -1)} disabled={idx === 0} title="Move up"
											className="w-7 h-8 flex items-center justify-center rounded text-steel-300 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer disabled:opacity-30 disabled:cursor-default">
											<FontAwesomeIcon icon={faArrowUp} className="text-xs" />
										</button>
										<button type="button" onClick={() => moveRow(row.key, 1)} disabled={idx === lines.length - 1} title="Move down"
											className="w-7 h-8 flex items-center justify-center rounded text-steel-300 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer disabled:opacity-30 disabled:cursor-default">
											<FontAwesomeIcon icon={faArrowDown} className="text-xs" />
										</button>
										<button type="button" onClick={() => setLines(rows => rows.filter(r => r.key !== row.key))} title="Remove"
											className="w-7 h-8 flex items-center justify-center rounded text-red-400 bg-transparent border border-red-400/40 hover:bg-red-400/10 cursor-pointer">
											<FontAwesomeIcon icon={faTrash} className="text-xs" />
										</button>
									</div>
								</div>
								<input
									type="text"
									value={row.description}
									onChange={e => updateRow(row.key, { description: e.target.value })}
									placeholder="Description (optional)"
									className="h-8 px-2 bg-steel-950 border border-steel-700 rounded text-xs text-steel-300 placeholder:text-steel-600 focus:outline-none focus:border-primary-500"
								/>
							</div>
						))}
						</div>
						</div>
						{!readOnly && (
							<button type="button" onClick={() => setLines(rows => [...rows, newRow()])} className={`${secondaryButtonClass} self-start`}>
								<FontAwesomeIcon icon={faPlus} />
								Add line
							</button>
						)}
					</section>

					<div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-6">
						<div className="flex flex-col gap-3">
							<Field label="VAT mention">
								<label className="flex items-center gap-2 text-sm text-steel-300 cursor-pointer">
									<input
										type="checkbox"
										checked={vatMention === null}
										onChange={e => setVatMention(e.target.checked ? null : (defaults?.vatMention ?? ''))}
									/>
									Use default for this client
								</label>
								{vatMention === null ? (
									<div className="text-sm text-steel-300 italic">{defaults?.vatMention ?? 'No mention (VAT charged)'}</div>
								) : (
									<input type="text" value={vatMention} onChange={e => setVatMention(e.target.value)} placeholder="No mention" className={inputClass} />
								)}
							</Field>
							<Field label="Notes">
								<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={textareaClass} />
							</Field>
						</div>
						<dl className="flex flex-col gap-1.5 text-sm self-start bg-steel-950 border border-steel-800 rounded p-3 tabular-nums">
							{computed.gross !== computed.net && (
								<>
									<Total label="Gross HT" value={computed.gross} />
									<Total label="Discount" value={computed.net - computed.gross} />
								</>
							)}
							<Total label="Total HT" value={computed.net} />
							<Total label="VAT" value={computed.vat} />
							<div className="border-t border-steel-800 my-1" />
							<Total label="Total TTC" value={computed.ttc} strong />
						</dl>
					</div>

					{error && <div className="text-sm text-red-400">{error}</div>}
				</fieldset>
			)}
		</ModalShell>
	)
}

function Total({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
	return (
		<div className={`flex items-center justify-between ${strong ? 'text-white font-semibold' : 'text-steel-300'}`}>
			<dt>{label}</dt>
			<dd><Money cents={value} /></dd>
		</div>
	)
}
