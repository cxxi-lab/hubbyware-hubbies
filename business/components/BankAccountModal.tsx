import { useState, type FormEvent } from 'react'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { errorMessage } from '@cxxi-lab/hubbyware-sdk'
import { createBankAccount, deleteBankAccount, updateBankAccount, type BankAccount, type BankAccountInput } from '../api/business'
import { ModalShell } from './ModalShell'
import { Field, dangerButtonClass, inputClass, nullable, primaryButtonClass, secondaryButtonClass } from './fields'

interface Props {
	account: BankAccount | null
	onClose: () => void
	onSaved: () => void
}

export function BankAccountModal({ account, onClose, onSaved }: Props) {
	const [form, setForm] = useState<BankAccountInput>(() => account ?? { label: '', bankName: null, iban: '', bic: null })
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		const payload: BankAccountInput = {
			label: form.label.trim(),
			bankName: nullable(form.bankName),
			iban: form.iban.replace(/\s/g, '').toUpperCase(),
			bic: nullable(form.bic)?.toUpperCase() ?? null
		}
		setSaving(true)
		setError(null)
		try {
			if (account) await updateBankAccount(account.id, payload)
			else await createBankAccount(payload)
			onSaved()
			onClose()
		} catch (err) {
			setError(errorMessage(err, 'Failed to save'))
		} finally {
			setSaving(false)
		}
	}

	async function handleDelete() {
		if (!account) return
		setSaving(true)
		try {
			await deleteBankAccount(account.id)
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
			title={account ? `Edit ${account.label}` : 'New bank account'}
			width="sm:max-w-lg"
			onClose={onClose}
			onSubmit={handleSubmit}
			footer={
				<>
					{account ? (
						<button type="button" onClick={handleDelete} disabled={saving} className={dangerButtonClass}>
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
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<Field label="Label">
					<input type="text" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className={inputClass} autoFocus />
				</Field>
				<Field label="Bank">
					<input type="text" value={form.bankName ?? ''} onChange={e => setForm({ ...form, bankName: e.target.value })} className={inputClass} />
				</Field>
			</div>
			<Field label="IBAN">
				<input type="text" value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} className={`${inputClass} font-mono`} />
			</Field>
			<Field label="BIC">
				<input type="text" value={form.bic ?? ''} onChange={e => setForm({ ...form, bic: e.target.value })} className={`${inputClass} font-mono`} />
			</Field>
			{error && <div className="text-sm text-red-400">{error}</div>}
		</ModalShell>
	)
}
