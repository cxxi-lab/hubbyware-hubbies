import { useEffect, useState, type FormEvent } from 'react'
import { faGoogle, faMicrosoft, faYahoo } from '@fortawesome/free-brands-svg-icons'
import { faArrowLeft, faArrowsRotate, faServer, faTrash, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { errorMessage, ConfirmationModal } from '@cxxi-lab/hubbyware-sdk'
import {
	createAccount, deleteAccount, fetchProviders, updateAccount,
	type AccountInput, type MailAccount, type MailEncryption, type MailProvider, type ProviderInfo
} from '../api/mail'
import { connectWithOAuth } from '../lib/oauth'
import { ModalShell } from './ModalShell'
import { Field, dangerButtonClass, inputClass, nullable, primaryButtonClass, secondaryButtonClass, textareaClass } from './fields'

interface Props {
	/** null: add an account */
	account: MailAccount | null
	onClose: () => void
	onSaved: () => void
}

/** `colour`: the brand's (Yahoo's purple lightened for the dark background); none for custom. */
export const PROVIDERS: Record<MailProvider, { label: string, icon: IconDefinition, line: string, colour?: string }> = {
	gmail: { label: 'Gmail', icon: faGoogle, line: 'Connect with your Google account', colour: '#4285F4' },
	microsoft: { label: 'Microsoft', icon: faMicrosoft, line: 'Outlook.com, Hotmail, Live, Microsoft 365', colour: '#00A4EF' },
	yahoo: { label: 'Yahoo', icon: faYahoo, line: 'With an app password', colour: '#8A4DFF' },
	custom: { label: 'Other (IMAP/SMTP)', icon: faServer, line: 'Any mailbox, its servers typed in' }
}

const APP_PASSWORD_HINTS: Partial<Record<MailProvider, string>> = {
	yahoo: 'An app password, not your Yahoo password: Account info → Account security → Generate app password.'
}

function initialInput(account: MailAccount | null, provider: MailProvider): AccountInput {
	return {
		label: account?.label ?? null,
		email: account?.email ?? '',
		displayName: account?.displayName ?? null,
		provider: account?.provider ?? provider,
		imapHost: account?.imapHost ?? '',
		imapPort: account?.imapPort ?? 993,
		imapEncryption: account?.imapEncryption ?? 'ssl',
		smtpHost: account?.smtpHost ?? '',
		smtpPort: account?.smtpPort ?? 465,
		smtpEncryption: account?.smtpEncryption ?? 'ssl',
		username: account?.username ?? null,
		password: null,
		signature: account?.signature ?? null,
		appendToSent: account?.appendToSent ?? true,
		enabled: account?.enabled ?? true
	}
}

/**
 * Adds or edits a mailbox. Adding starts with its provider: Gmail and Microsoft connect with OAuth
 * (their consent in an app window), Yahoo and the others with a password, tested (IMAP then SMTP
 * login) before saving; the server answers with what failed.
 */
export function AccountModal({ account, onClose, onSaved }: Props) {
	const [providers, setProviders] = useState<ProviderInfo[]>([])
	const [picked, setPicked] = useState<MailProvider | null>(account?.provider ?? null)

	useEffect(() => {
		fetchProviders().then(setProviders).catch(() => {})
	}, [])

	const info = providers.find(p => p.id === picked)
	const oauth = account ? account.auth === 'oauth' : info?.auth === 'oauth'

	if (picked === null) {
		return <ProviderPicker providers={providers} onPick={setPicked} onClose={onClose} />
	}
	if (oauth) {
		return <OAuthAccount provider={picked} info={info} account={account} onBack={account ? null : () => setPicked(null)} onClose={onClose} onSaved={onSaved} />
	}
	return <PasswordAccount provider={picked} preset={info?.preset ?? null} account={account} onBack={account ? null : () => setPicked(null)} onClose={onClose} onSaved={onSaved} />
}

function ProviderPicker({ providers, onPick, onClose }: { providers: ProviderInfo[], onPick: (p: MailProvider) => void, onClose: () => void }) {
	const order: MailProvider[] = ['gmail', 'microsoft', 'yahoo', 'custom']
	return (
		<ModalShell title="Add a mailbox" width="max-w-xl" onClose={onClose} onSubmit={e => e.preventDefault()} footer={(
			<>
				<span />
				<button type="button" onClick={onClose} className={secondaryButtonClass}>Cancel</button>
			</>
		)}>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{order.map(id => {
					const meta = PROVIDERS[id]
					const known = providers.find(p => p.id === id)
					return (
						<button
							key={id}
							type="button"
							onClick={() => onPick(id)}
							className="flex items-center gap-3 p-4 rounded border border-steel-700 bg-steel-950 hover:border-primary-500 text-left cursor-pointer"
						>
							<FontAwesomeIcon icon={meta.icon} className="text-xl w-6 text-steel-100" />
							<span className="min-w-0">
								<span className="block text-sm text-white">{meta.label}</span>
								<span className="block text-xs text-steel-300">{known && !known.configured ? 'Not set up on the server yet' : meta.line}</span>
							</span>
						</button>
					)
				})}
			</div>
		</ModalShell>
	)
}

function BackButton({ onBack }: { onBack: (() => void) | null }) {
	if (!onBack) return null
	return (
		<button type="button" onClick={onBack} className={secondaryButtonClass}>
			<FontAwesomeIcon icon={faArrowLeft} />
			Back
		</button>
	)
}

/** Gmail, Microsoft: connect (or reconnect) through the provider, then the account's own settings. */
function OAuthAccount({ provider, info, account, onBack, onClose, onSaved }: {
	provider: MailProvider
	info: ProviderInfo | undefined
	account: MailAccount | null
	onBack: (() => void) | null
	onClose: () => void
	onSaved: () => void
}) {
	const meta = PROVIDERS[provider]
	const [input, setInput] = useState<AccountInput>(() => initialInput(account, provider))
	const [busy, setBusy] = useState<'connect' | 'save' | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const set = <K extends keyof AccountInput>(key: K, value: AccountInput[K]) => setInput(prev => ({ ...prev, [key]: value }))
	const notSetUp = info !== undefined && !info.configured

	async function connect() {
		setBusy('connect')
		setError(null)
		try {
			const connected = await connectWithOAuth(provider, info, account)
			if (connected) onSaved()
		}
		catch (err) {
			setError(errorMessage(err, 'The connection failed'))
		}
		finally {
			setBusy(null)
		}
	}

	async function save(e: FormEvent) {
		e.preventDefault()
		if (!account) return
		setBusy('save')
		setError(null)
		try {
			await updateAccount(account.id, { ...input, label: nullable(input.label), displayName: nullable(input.displayName), signature: nullable(input.signature), password: null })
			onSaved()
		}
		catch (err) {
			setError(errorMessage(err, 'Saving failed'))
		}
		finally {
			setBusy(null)
		}
	}

	const connectButton = (
		<button type="button" onClick={connect} disabled={busy !== null || notSetUp} className={account ? secondaryButtonClass : primaryButtonClass}>
			<FontAwesomeIcon icon={account ? faArrowsRotate : meta.icon} />
			{busy === 'connect' ? 'Finish in your browser…' : account ? 'Reconnect' : `Connect with ${meta.label}`}
		</button>
	)

	return (
		<>
			<ModalShell
				title={account ? `Edit ${account.label}` : `Add a ${meta.label} mailbox`}
				onClose={onClose}
				onSubmit={save}
				footer={(
					<>
						{account ? (
							<button type="button" onClick={() => setConfirmDelete(true)} className={dangerButtonClass}>
								<FontAwesomeIcon icon={faTrash} />
								Remove
							</button>
						) : <BackButton onBack={onBack} />}
						<div className="flex items-center gap-2">
							<button type="button" onClick={onClose} className={secondaryButtonClass}>Cancel</button>
							{account
								? <button type="submit" disabled={busy !== null} className={primaryButtonClass}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
								: connectButton}
						</div>
					</>
				)}
			>
				<div className="flex items-start gap-3 p-3 rounded border border-steel-700 bg-steel-950">
					<FontAwesomeIcon icon={meta.icon} className="mt-0.5 text-lg text-steel-100" />
					<div className="min-w-0 flex-1 text-sm text-steel-100">
						{account ? (
							<>Connected as <span className="text-white">{account.email}</span> through {meta.label}. Reconnect when the provider asks for it again (expired or revoked access).</>
						) : notSetUp ? (
							<>{meta.label} needs an OAuth client registered for Hubbyware, not set up on the server yet.</>
						) : (
							<>{meta.label}&apos;s sign-in opens in your browser: pick the mailbox, allow Hubbyware to read and send its mail, then come back here. No password is stored, only an access the provider can revoke (Settings › Connections).</>
						)}
					</div>
					{account && connectButton}
				</div>

				{account && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Field label="Sender name" hint="Shown to the people you write to">
							<input value={input.displayName ?? ''} onChange={e => set('displayName', e.target.value)} className={inputClass} />
						</Field>
						<Field label="Label" hint="How the mailbox shows up here (defaults to the address)">
							<input value={input.label ?? ''} onChange={e => set('label', e.target.value)} className={inputClass} />
						</Field>
						<Field label="Signature" className="sm:col-span-2">
							<textarea rows={3} value={input.signature ?? ''} onChange={e => set('signature', e.target.value)} className={textareaClass} />
						</Field>
					</div>
				)}

				{error && <div className="text-sm text-red-400 break-words">{error}</div>}
			</ModalShell>

			{confirmDelete && account && <RemoveConfirmation account={account} onClose={() => setConfirmDelete(false)} onSaved={onSaved} />}
		</>
	)
}

/** Yahoo and the others: an (app) password, tested before saving. */
function PasswordAccount({ provider, preset, account, onBack, onClose, onSaved }: {
	provider: MailProvider
	preset: ProviderInfo['preset']
	account: MailAccount | null
	onBack: (() => void) | null
	onClose: () => void
	onSaved: () => void
}) {
	const [input, setInput] = useState<AccountInput>(() => initialInput(account, provider))
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [confirmDelete, setConfirmDelete] = useState(false)

	const set = <K extends keyof AccountInput>(key: K, value: AccountInput[K]) => setInput(prev => ({ ...prev, [key]: value }))
	const custom = input.provider === 'custom'

	async function submit(e: FormEvent) {
		e.preventDefault()
		setSaving(true)
		setError(null)
		const payload: AccountInput = {
			...input,
			label: nullable(input.label),
			displayName: nullable(input.displayName),
			username: nullable(input.username),
			password: input.password === '' ? null : input.password,
			signature: nullable(input.signature)
		}
		try {
			if (account) await updateAccount(account.id, payload)
			else await createAccount(payload)
			onSaved()
		}
		catch (err) {
			setError(errorMessage(err, 'Saving failed'))
		}
		finally {
			setSaving(false)
		}
	}

	return (
		<>
			<ModalShell
				title={account ? `Edit ${account.label}` : `Add a ${PROVIDERS[provider].label} mailbox`}
				onClose={onClose}
				onSubmit={submit}
				footer={(
					<>
						{account ? (
							<button type="button" onClick={() => setConfirmDelete(true)} className={dangerButtonClass}>
								<FontAwesomeIcon icon={faTrash} />
								Remove
							</button>
						) : <BackButton onBack={onBack} />}
						<div className="flex items-center gap-2">
							<button type="button" onClick={onClose} className={secondaryButtonClass}>Cancel</button>
							<button type="submit" disabled={saving} className={primaryButtonClass}>
								{saving ? 'Checking…' : account ? 'Save' : 'Add'}
							</button>
						</div>
					</>
				)}
			>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Field label="Email address">
						<input type="email" required value={input.email} onChange={e => set('email', e.target.value)} className={inputClass} autoFocus={!account} />
					</Field>
					<Field label={account ? 'Password (leave empty to keep)' : 'Password'} hint={APP_PASSWORD_HINTS[input.provider]}>
						<input
							type="password"
							required={!account}
							value={input.password ?? ''}
							onChange={e => set('password', e.target.value)}
							className={inputClass}
							autoComplete="new-password"
						/>
					</Field>
					<Field label="Sender name" hint="Shown to the people you write to">
						<input value={input.displayName ?? ''} onChange={e => set('displayName', e.target.value)} className={inputClass} />
					</Field>
					<Field label="Label" hint="How the mailbox shows up here (defaults to the address)">
						<input value={input.label ?? ''} onChange={e => set('label', e.target.value)} className={inputClass} />
					</Field>
				</div>

				{custom ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Endpoint
							title="IMAP (incoming)"
							host={input.imapHost ?? ''} port={input.imapPort ?? 993} encryption={input.imapEncryption ?? 'ssl'}
							onChange={(host, port, encryption) => setInput(prev => ({ ...prev, imapHost: host, imapPort: port, imapEncryption: encryption }))}
						/>
						<Endpoint
							title="SMTP (outgoing)"
							host={input.smtpHost ?? ''} port={input.smtpPort ?? 465} encryption={input.smtpEncryption ?? 'ssl'}
							onChange={(host, port, encryption) => setInput(prev => ({ ...prev, smtpHost: host, smtpPort: port, smtpEncryption: encryption }))}
						/>
						<Field label="Username" hint="Defaults to the email address">
							<input value={input.username ?? ''} onChange={e => set('username', e.target.value)} className={inputClass} />
						</Field>
					</div>
				) : preset && (
					<div className="text-xs text-steel-500">
						IMAP {preset.imapHost}:{preset.imapPort} · SMTP {preset.smtpHost}:{preset.smtpPort}
					</div>
				)}

				<Field label="Signature">
					<textarea rows={3} value={input.signature ?? ''} onChange={e => set('signature', e.target.value)} className={textareaClass} />
				</Field>

				{error && <div className="text-sm text-red-400 break-words">{error}</div>}
			</ModalShell>

			{confirmDelete && account && <RemoveConfirmation account={account} onClose={() => setConfirmDelete(false)} onSaved={onSaved} />}
		</>
	)
}

function RemoveConfirmation({ account, onClose, onSaved }: { account: MailAccount, onClose: () => void, onSaved: () => void }) {
	return (
		<ConfirmationModal
			title="Remove this mailbox?"
			confirmLabel="Remove"
			confirmColor="danger"
			onConfirm={async () => { await deleteAccount(account.id); onSaved() }}
			onClose={onClose}
		>
			hub forgets {account.email} and its local copy. Nothing is deleted from the mailbox itself.
		</ConfirmationModal>
	)
}

function Endpoint({ title, host, port, encryption, onChange }: {
	title: string
	host: string
	port: number
	encryption: MailEncryption
	onChange: (host: string, port: number, encryption: MailEncryption) => void
}) {
	return (
		<Field label={title}>
			<div className="flex gap-2">
				<input placeholder="host" required value={host} onChange={e => onChange(e.target.value, port, encryption)} className={`${inputClass} flex-1 min-w-0`} />
				<input type="number" min={1} max={65535} value={port} onChange={e => onChange(host, Number(e.target.value), encryption)} className={`${inputClass} w-20`} />
				<select value={encryption} onChange={e => onChange(host, port, e.target.value as MailEncryption)} className={`${inputClass} w-28`}>
					<option value="ssl">SSL/TLS</option>
					<option value="starttls">STARTTLS</option>
				</select>
			</div>
		</Field>
	)
}
