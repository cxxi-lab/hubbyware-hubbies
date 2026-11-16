import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { errorMessage } from '@cxxi-lab/hub-sdk'
import {
	fetchBankAccounts,
	fetchSettings,
	updateSettings,
	type BankAccount,
	type BusinessSettings as Settings,
	type BusinessSettingsInput,
	type VatRegime
} from '../api/business'
import { parseRate, rateToInput } from '../lib/money'
import { BankAccountModal } from '../components/BankAccountModal'
import {
	CountrySelect,
	Field,
	SectionTitle,
	inputClass,
	nullable,
	primaryButtonClass,
	secondaryButtonClass
} from '../components/fields'

const VAT_REGIMES: { value: VatRegime; label: string; hint: string }[] = [
	{ value: 'franchise', label: 'Franchise en base', hint: 'No VAT charged — art. 293 B du CGI' },
	{ value: 'standard', label: 'VAT registered', hint: 'VAT charged (20 % by default in France)' }
]

export function BusinessSettings() {
	const [form, setForm] = useState<BusinessSettingsInput | null>(null)
	const [nextNumber, setNextNumber] = useState('')
	const [penalty, setPenalty] = useState('')
	const [accounts, setAccounts] = useState<BankAccount[]>([])
	const [accountModal, setAccountModal] = useState<{ account: BankAccount | null } | null>(null)
	const [saving, setSaving] = useState(false)
	const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

	const apply = (s: Settings) => {
		const { nextInvoiceNumber, updatedAt: _updatedAt, ...input } = s
		setForm(input)
		setNextNumber(nextInvoiceNumber)
		setPenalty(rateToInput(s.latePenaltyRate))
	}

	const reloadAccounts = useCallback(() => {
		fetchBankAccounts().then(setAccounts).catch(err => setStatus({ kind: 'error', text: errorMessage(err) }))
	}, [])

	useEffect(() => {
		fetchSettings().then(apply).catch(err => setStatus({ kind: 'error', text: errorMessage(err, 'Failed to load') }))
		reloadAccounts()
	}, [reloadAccounts])

	if (!form) {
		return (
			<div className="flex-1 min-h-0 flex flex-col bg-steel-950 p-6 text-sm">
				{status ? <span className="text-red-400">{status.text}</span> : <span className="text-steel-400">Loading…</span>}
			</div>
		)
	}

	const set = <K extends keyof BusinessSettingsInput>(key: K, value: BusinessSettingsInput[K]) =>
		setForm(f => (f ? { ...f, [key]: value } : f))
	const text = (key: keyof BusinessSettingsInput) => ({
		value: (form[key] as string | null) ?? '',
		onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
		className: inputClass
	})

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (!form) return
		const latePenaltyRate = penalty.trim() === '' ? 0 : parseRate(penalty)
		if (latePenaltyRate === null) {
			setStatus({ kind: 'error', text: 'Invalid late penalty rate' })
			return
		}
		setSaving(true)
		setStatus(null)
		try {
			const saved = await updateSettings({
				...form,
				name: form.name.trim(),
				activity: nullable(form.activity),
				siren: nullable(form.siren)?.replace(/\s/g, '') ?? null,
				address: nullable(form.address),
				zipcode: nullable(form.zipcode),
				city: nullable(form.city),
				phone: nullable(form.phone),
				email: nullable(form.email),
				website: nullable(form.website),
				vatNumber: nullable(form.vatNumber)?.replace(/\s/g, '').toUpperCase() ?? null,
				invoiceNumberPrefix: form.invoiceNumberPrefix.trim(),
				latePenaltyRate
			})
			apply(saved)
			setStatus({ kind: 'ok', text: 'Saved' })
		} catch (err) {
			setStatus({ kind: 'error', text: errorMessage(err, 'Failed to save') })
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="flex-1 min-h-0 flex flex-col bg-steel-950">
			<header className="flex items-center justify-between gap-3 px-6 max-sm:px-4 py-4 border-b border-steel-800">
				<h1 className="text-lg font-semibold text-white">Business settings</h1>
			</header>

			<div className="flex-1 min-h-0 overflow-y-auto p-6">
				<form onSubmit={handleSubmit} className="max-w-3xl flex flex-col gap-4">
					<SectionTitle>Issuer</SectionTitle>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<Field label="Name"><input type="text" {...text('name')} /></Field>
						<Field label="Activity"><input type="text" {...text('activity')} /></Field>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<Field label="SIREN"><input type="text" {...text('siren')} placeholder="9 digits" /></Field>
						<Field label="Phone"><input type="text" {...text('phone')} /></Field>
						<Field label="Email"><input type="email" {...text('email')} /></Field>
					</div>
					<Field label="Website"><input type="text" {...text('website')} /></Field>
					<Field label="Address"><input type="text" {...text('address')} /></Field>
					<div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_2fr] gap-3">
						<Field label="Zipcode"><input type="text" {...text('zipcode')} /></Field>
						<Field label="City"><input type="text" {...text('city')} /></Field>
						<Field label="Country">
							<CountrySelect value={form.country} onChange={code => set('country', code ?? 'FR')} />
						</Field>
					</div>

					<SectionTitle>VAT</SectionTitle>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<Field label="Regime" hint={VAT_REGIMES.find(r => r.value === form.vatRegime)?.hint}>
							<select value={form.vatRegime} onChange={e => set('vatRegime', e.target.value as VatRegime)} className={inputClass}>
								{VAT_REGIMES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
							</select>
						</Field>
						<Field label="Intra-EU VAT number" hint="Once VAT registered">
							<input type="text" {...text('vatNumber')} />
						</Field>
					</div>

					<SectionTitle>Invoicing</SectionTitle>
					<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
						<Field label="Number prefix" hint="e.g. FAC-2026-">
							<input type="text" {...text('invoiceNumberPrefix')} />
						</Field>
						<Field label="Next sequence" hint={`Next number: ${nextNumber}`}>
							<input
								type="number"
								min={1}
								value={form.nextInvoiceSequence}
								onChange={e => set('nextInvoiceSequence', Number(e.target.value))}
								className={inputClass}
							/>
						</Field>
						<Field label="Payment terms (days)">
							<input
								type="number"
								min={0}
								max={365}
								value={form.paymentTermDays}
								onChange={e => set('paymentTermDays', Number(e.target.value))}
								className={inputClass}
							/>
						</Field>
						<Field label="Late penalty (%)">
							<input type="text" value={penalty} onChange={e => setPenalty(e.target.value)} className={inputClass} />
						</Field>
					</div>
					<Field label="Default bank account">
						<select
							value={form.defaultBankAccountId ?? ''}
							onChange={e => set('defaultBankAccountId', e.target.value === '' ? null : e.target.value)}
							className={inputClass}
						>
							<option value="">—</option>
							{accounts.map(a => <option key={a.id} value={a.id}>{a.label} — {a.iban}</option>)}
						</select>
					</Field>

					<div className="flex items-center gap-3">
						<button type="submit" disabled={saving} className={`${primaryButtonClass} self-start`}>
							{saving ? 'Saving…' : 'Save settings'}
						</button>
						{status && (
							<span className={`text-sm ${status.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{status.text}</span>
						)}
					</div>
				</form>

				<section className="max-w-3xl flex flex-col gap-2 mt-8">
					<div className="flex items-center justify-between">
						<SectionTitle>Bank accounts</SectionTitle>
						<button type="button" onClick={() => setAccountModal({ account: null })} className={secondaryButtonClass}>
							<FontAwesomeIcon icon={faPlus} />
							Add account
						</button>
					</div>
					{accounts.length === 0 ? (
						<div className="text-xs text-steel-500 italic px-2 py-3 border border-dashed border-steel-800 rounded">No bank accounts.</div>
					) : (
						accounts.map(a => (
							<button
								key={a.id}
								type="button"
								onClick={() => setAccountModal({ account: a })}
								className="flex items-center justify-between gap-3 px-3 py-2 bg-steel-900 border border-steel-800 hover:border-steel-600 rounded text-left cursor-pointer"
							>
								<span className="text-sm text-steel-100">
									{a.label}
									{a.bankName && <span className="text-steel-500"> · {a.bankName}</span>}
									{a.id === form.defaultBankAccountId && <span className="text-[10px] text-primary-500 ml-2">default</span>}
								</span>
								<span className="text-xs text-steel-400 font-mono">{a.iban}</span>
							</button>
						))
					)}
				</section>
			</div>

			{accountModal && (
				<BankAccountModal account={accountModal.account} onClose={() => setAccountModal(null)} onSaved={reloadAccounts} />
			)}
		</div>
	)
}
