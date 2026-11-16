import { useState, type FormEvent } from 'react'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { errorMessage } from '@cxxi-lab/hub-sdk'
import { createClient, deleteClient, updateClient, type Client, type ClientInput } from '../api/business'
import { ModalShell } from './ModalShell'
import {
	CountrySelect,
	Field,
	SectionTitle,
	dangerButtonClass,
	inputClass,
	nullable,
	primaryButtonClass,
	secondaryButtonClass
} from './fields'

interface Props {
	client: Client | null
	onClose: () => void
	onSaved: () => void
}

const EMPTY: ClientInput = {
	label: '',
	name: '',
	siren: null,
	siret: null,
	vatNumber: null,
	email: null,
	address: null,
	zipcode: null,
	city: null,
	country: 'FR',
	deliveryAddress: null,
	deliveryZipcode: null,
	deliveryCity: null,
	deliveryCountry: null
}

export function ClientModal({ client, onClose, onSaved }: Props) {
	const [form, setForm] = useState<ClientInput>(() => (client ? { ...EMPTY, ...client } : EMPTY))
	const [hasDelivery, setHasDelivery] = useState(() => !!client?.deliveryAddress)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const set = <K extends keyof ClientInput>(key: K, value: ClientInput[K]) => setForm(f => ({ ...f, [key]: value }))
	const text = (key: keyof ClientInput) => ({
		value: (form[key] as string | null) ?? '',
		onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
		className: inputClass
	})

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (!form.label.trim() || !form.name.trim()) {
			setError('Label and name are required')
			return
		}
		const payload: ClientInput = {
			label: form.label.trim(),
			name: form.name.trim(),
			siren: nullable(form.siren)?.replace(/\s/g, '') ?? null,
			siret: nullable(form.siret)?.replace(/\s/g, '') ?? null,
			vatNumber: nullable(form.vatNumber)?.replace(/\s/g, '').toUpperCase() ?? null,
			email: nullable(form.email),
			address: nullable(form.address),
			zipcode: nullable(form.zipcode),
			city: nullable(form.city),
			country: form.country,
			deliveryAddress: hasDelivery ? nullable(form.deliveryAddress) : null,
			deliveryZipcode: hasDelivery ? nullable(form.deliveryZipcode) : null,
			deliveryCity: hasDelivery ? nullable(form.deliveryCity) : null,
			deliveryCountry: hasDelivery ? form.deliveryCountry : null
		}

		setSaving(true)
		setError(null)
		try {
			if (client) await updateClient(client.id, payload)
			else await createClient(payload)
			onSaved()
			onClose()
		} catch (err) {
			setError(errorMessage(err, 'Failed to save'))
		} finally {
			setSaving(false)
		}
	}

	async function handleDelete() {
		if (!client) return
		setSaving(true)
		try {
			await deleteClient(client.id)
			onSaved()
			onClose()
		} catch (err) {
			setError(errorMessage(err, 'Failed to delete'))
		} finally {
			setSaving(false)
		}
	}

	return (
		<ModalShell
			title={client ? `Edit ${client.label}` : 'New client'}
			onClose={onClose}
			onSubmit={handleSubmit}
			footer={
				<>
					{client ? (
						<button
							type="button"
							onClick={handleDelete}
							disabled={saving || client.invoiceCount > 0}
							title={client.invoiceCount > 0 ? 'Clients with invoices cannot be deleted' : undefined}
							className={dangerButtonClass}
						>
							<FontAwesomeIcon icon={faTrash} />
							Delete
						</button>
					) : <div />}
					<div className="flex items-center gap-2">
						<button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
						<button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Saving…' : 'Save'}</button>
					</div>
				</>
			}
		>
			<div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3">
				<Field label="Label" hint="Short internal handle">
					<input type="text" {...text('label')} autoFocus />
				</Field>
				<Field label="Legal name">
					<input type="text" {...text('name')} />
				</Field>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<Field label="SIREN"><input type="text" {...text('siren')} placeholder="9 digits" /></Field>
				<Field label="SIRET"><input type="text" {...text('siret')} placeholder="14 digits" /></Field>
				<Field label="VAT number"><input type="text" {...text('vatNumber')} placeholder="FR…" /></Field>
			</div>

			<Field label="Email"><input type="email" {...text('email')} /></Field>

			<SectionTitle>Billing address</SectionTitle>
			<Field label="Address"><input type="text" {...text('address')} /></Field>
			<div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_2fr] gap-3">
				<Field label="Zipcode"><input type="text" {...text('zipcode')} /></Field>
				<Field label="City"><input type="text" {...text('city')} /></Field>
				<Field label="Country">
					<CountrySelect value={form.country} onChange={code => set('country', code ?? 'FR')} />
				</Field>
			</div>

			<label className="flex items-center gap-2 text-sm text-steel-300 cursor-pointer">
				<input type="checkbox" checked={hasDelivery} onChange={e => setHasDelivery(e.target.checked)} />
				Different delivery address
			</label>
			{hasDelivery && (
				<>
					<Field label="Delivery address"><input type="text" {...text('deliveryAddress')} /></Field>
					<div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_2fr] gap-3">
						<Field label="Zipcode"><input type="text" {...text('deliveryZipcode')} /></Field>
						<Field label="City"><input type="text" {...text('deliveryCity')} /></Field>
						<Field label="Country">
							<CountrySelect value={form.deliveryCountry} onChange={code => set('deliveryCountry', code)} allowEmpty />
						</Field>
					</div>
				</>
			)}

			{error && <div className="text-sm text-red-400">{error}</div>}
		</ModalShell>
	)
}
