import { ApiError, collection } from '@cxxi-lab/hub-sdk'
import { formatIban, isValidBic, isValidIban, normalizeIban } from '../lib/iban'
import { lineTotals, quantityToMilli } from '../lib/money'
import { vatRule, vatZone } from '../lib/vat'

// Business's data: its collections (hubbies/business/models: settings, bank_account, client,
// invoice with its lines), the sensitive fields encrypted by the platform. What the server used to
// do lives here now: VAT defaults (lib/vat), totals (lib/money), IBAN checks (lib/iban), due
// dates, drafts only editable.
// Amounts are integer cents, rates integer basis points (2000 = 20 %).

export type VatRegime = 'franchise' | 'standard'
export type VatZone = 'fr' | 'eu' | 'non_eu'
export type OperationCategory = 'goods' | 'services' | 'mixed'
export type InvoiceStatus = 'draft' | 'issued'
export type PaymentMethod = 'transfer' | 'card' | 'check' | 'cash' | 'other'

export interface BusinessSettings {
	name: string
	activity: string | null
	siren: string | null
	address: string | null
	zipcode: string | null
	city: string | null
	country: string
	phone: string | null
	email: string | null
	website: string | null
	vatRegime: VatRegime
	vatNumber: string | null
	invoiceNumberPrefix: string
	nextInvoiceSequence: number
	nextInvoiceNumber: string
	paymentTermDays: number
	latePenaltyRate: number
	defaultBankAccountId: string | null
	updatedAt: string
}

export type BusinessSettingsInput = Omit<BusinessSettings, 'nextInvoiceNumber' | 'updatedAt'>

export interface BankAccount {
	id: string
	label: string
	bankName: string | null
	iban: string
	bic: string | null
}

export type BankAccountInput = Omit<BankAccount, 'id'>

export interface Client {
	id: string
	label: string
	name: string
	siren: string | null
	siret: string | null
	vatNumber: string | null
	email: string | null
	address: string | null
	zipcode: string | null
	city: string | null
	country: string
	vatZone: VatZone
	deliveryAddress: string | null
	deliveryZipcode: string | null
	deliveryCity: string | null
	deliveryCountry: string | null
	currency: string
	invoiceCount: number
	createdAt: string
	updatedAt: string
}

export type ClientInput = Omit<Client, 'id' | 'vatZone' | 'currency' | 'invoiceCount' | 'createdAt' | 'updatedAt'>

export interface InvoiceSummary {
	id: string
	number: string | null
	status: InvoiceStatus
	client: { id: string; label: string; name: string }
	issueDate: string | null
	dueDate: string | null
	netTotalHt: number
	totalTtc: number
	currency: string
	paidAt: string | null
	updatedAt: string
}

export interface InvoiceLine {
	id: string
	title: string
	description: string | null
	quantity: string
	unit: string | null
	unitPrice: number
	vatRate: number
	discountRate: number
	totalHt: number
	vatAmount: number
}

export interface Invoice extends InvoiceSummary {
	performanceStartDate: string | null
	performanceEndDate: string | null
	operationCategory: OperationCategory
	vatMention: string | null
	bankAccountId: string | null
	notes: string | null
	grossTotalHt: number
	totalVat: number
	paymentMethod: PaymentMethod | null
	paymentReference: string | null
	einvoicingStatus: string | null
	createdAt: string
	lines: InvoiceLine[]
}

export interface InvoiceLineInput {
	title: string
	description: string | null
	quantity: string
	unit: string | null
	unitPrice: number
	/** null → VAT default for the client/category */
	vatRate: number | null
	discountRate: number
}

export interface InvoiceInput {
	clientId: string
	issueDate: string | null
	/** null → issue date + payment terms */
	dueDate: string | null
	performanceStartDate: string | null
	performanceEndDate: string | null
	operationCategory: OperationCategory
	/** null → VAT default mention, '' → none */
	vatMention: string | null
	bankAccountId: string | null
	notes: string | null
	lines: InvoiceLineInput[]
}

export interface VatDefaults {
	vatRegime: VatRegime
	vatZone: VatZone
	vatRate: number
	vatMention: string | null
}

// The collections, as stored (the platform adds id, _createdAt, _updatedAt, _version).

type SettingsFields = Omit<BusinessSettings, 'nextInvoiceNumber' | 'updatedAt'>
type BankAccountFields = Omit<BankAccount, 'id'>
type ClientFields = Omit<Client, 'id' | 'vatZone' | 'invoiceCount' | 'createdAt' | 'updatedAt'> & { qontoClientId?: string | null }
interface LineFields {
	title: string
	description: string | null
	quantity: string
	unit: string | null
	unitPrice: number
	vatRate: number
	discountRate: number
	totalHt: number
	vatAmount: number
}
interface InvoiceFields {
	clientId: string
	status: InvoiceStatus
	number: string | null
	issueDate: string | null
	dueDate: string | null
	performanceStartDate: string | null
	performanceEndDate: string | null
	operationCategory: OperationCategory
	currency: string
	vatMention: string | null
	bankAccountId: string | null
	notes: string | null
	grossTotalHt: number
	netTotalHt: number
	totalVat: number
	totalTtc: number
	paidAt: string | null
	paymentMethod: PaymentMethod | null
	paymentReference: string | null
	einvoicingStatus: string | null
	lines: LineFields[]
}

const settingsStore = collection<SettingsFields>('business', 'settings')
const accounts = collection<BankAccountFields>('business', 'bank_account')
const clients = collection<ClientFields>('business', 'client')
const invoices = collection<InvoiceFields>('business', 'invoice')

/** A unique index refusing a write: the label is taken. */
async function uniqueLabel<T>(write: Promise<T>, what: string): Promise<T> {
	try {
		return await write
	}
	catch (err) {
		if (err instanceof ApiError && err.status === 409) throw new Error(`A ${what} with this label already exists`)
		throw err
	}
}

const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })

/** Today, on this device's calendar (YYYY-MM-DD). */
function today(): string {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(date: string, days: number): string {
	const d = new Date(`${date}T12:00:00Z`)
	d.setUTCDate(d.getUTCDate() + days)
	return d.toISOString().slice(0, 10)
}

// Settings (one document per account, made on first read)

const SETTINGS_DEFAULTS: SettingsFields = {
	name: '', activity: null, siren: null, address: null, zipcode: null, city: null, country: 'FR', phone: null,
	email: null, website: null, vatRegime: 'franchise', vatNumber: null, invoiceNumberPrefix: '', nextInvoiceSequence: 1,
	paymentTermDays: 30, latePenaltyRate: 0, defaultBankAccountId: null
}

/**
 * Made under a fixed id: two devices making it offline make the same document (their fields
 * merge) instead of two. One made before (another id) is kept: the oldest wins.
 */
const SETTINGS_ID = '00000000-0000-7000-8000-000000000001'

async function settingsDocument() {
	const all = await settingsStore.findAll({ sort: '_createdAt' })
	return all.find(d => d.id === SETTINGS_ID) ?? all[0] ?? settingsStore.createWithId(SETTINGS_ID, SETTINGS_DEFAULTS)
}

function settingsOf(d: SettingsFields & { _updatedAt: string }): BusinessSettings {
	const s = { ...SETTINGS_DEFAULTS }
	for (const key of Object.keys(SETTINGS_DEFAULTS) as (keyof SettingsFields)[]) {
		if (d[key] !== undefined) (s as Record<string, unknown>)[key] = d[key]
	}
	return { ...s, nextInvoiceNumber: `${s.invoiceNumberPrefix}${s.nextInvoiceSequence}`, updatedAt: d._updatedAt }
}

export async function fetchSettings(): Promise<BusinessSettings> {
	return settingsOf(await settingsDocument())
}

export async function updateSettings(input: BusinessSettingsInput): Promise<BusinessSettings> {
	const current = await settingsDocument()
	const fields = { ...SETTINGS_DEFAULTS, ...input, country: input.country.toUpperCase() }
	return settingsOf(await settingsStore.replace(current.id, fields))
}

// Bank accounts

function accountOf(d: BankAccountFields & { id: string }): BankAccount {
	return { id: d.id, label: d.label, bankName: d.bankName ?? null, iban: formatIban(d.iban), bic: d.bic ?? null }
}

function accountFields(input: BankAccountInput): BankAccountFields {
	if (!isValidIban(input.iban)) throw new Error('This IBAN is not valid')
	const bic = input.bic?.replace(/\s+/g, '').toUpperCase() || null
	if (bic !== null && !isValidBic(bic)) throw new Error('This BIC is not valid')
	return { label: input.label.trim(), bankName: input.bankName?.trim() || null, iban: normalizeIban(input.iban), bic }
}

export async function fetchBankAccounts(): Promise<BankAccount[]> {
	return (await accounts.findAll({ sort: 'label' })).map(accountOf)
}

export async function createBankAccount(input: BankAccountInput) {
	return accountOf(await uniqueLabel(accounts.create(accountFields(input)), 'bank account'))
}

export async function updateBankAccount(id: string, input: BankAccountInput) {
	return accountOf(await uniqueLabel(accounts.replace(id, accountFields(input)), 'bank account'))
}

/** Invoices and settings referring to it lose it. */
export async function deleteBankAccount(id: string) {
	await accounts.remove(id)
	return { ok: true }
}

// Clients

function clientOf(d: ClientFields & { id: string, _createdAt: string, _updatedAt: string }, invoiceCount: number): Client {
	return {
		id: d.id, label: d.label, name: d.name, siren: d.siren ?? null, siret: d.siret ?? null, vatNumber: d.vatNumber ?? null,
		email: d.email ?? null, address: d.address ?? null, zipcode: d.zipcode ?? null, city: d.city ?? null,
		country: d.country ?? 'FR', vatZone: vatZone(d.country ?? 'FR'),
		deliveryAddress: d.deliveryAddress ?? null, deliveryZipcode: d.deliveryZipcode ?? null, deliveryCity: d.deliveryCity ?? null,
		deliveryCountry: d.deliveryCountry ?? null, currency: d.currency ?? 'EUR', invoiceCount,
		createdAt: d._createdAt, updatedAt: d._updatedAt
	}
}

function clientFields(input: ClientInput): ClientFields {
	return { ...input, label: input.label.trim(), name: input.name.trim(), country: input.country.toUpperCase(), deliveryCountry: input.deliveryCountry?.toUpperCase() ?? null, currency: 'EUR' }
}

async function invoiceCounts(): Promise<Map<string, number>> {
	const counts = new Map<string, number>()
	for (const i of await invoices.findAll()) counts.set(i.clientId, (counts.get(i.clientId) ?? 0) + 1)
	return counts
}

/** By label (their labels are encrypted: sorted here). */
export async function fetchClients(): Promise<Client[]> {
	const [list, counts] = await Promise.all([clients.findAll(), invoiceCounts()])
	return list.map(d => clientOf(d, counts.get(d.id) ?? 0)).sort(byLabel)
}

export async function createClient(input: ClientInput) {
	return clientOf(await uniqueLabel(clients.create(clientFields(input)), 'client'), 0)
}

export async function updateClient(id: string, input: ClientInput) {
	const saved = await uniqueLabel(clients.update(id, clientFields(input)), 'client')
	return clientOf(saved, (await invoiceCounts()).get(id) ?? 0)
}

/** Refused while it has invoices. */
export async function deleteClient(id: string) {
	try {
		await clients.remove(id)
	}
	catch (err) {
		if (err instanceof ApiError && err.status === 409) throw new Error('This client has invoices and cannot be deleted')
		throw err
	}
	return { ok: true }
}

// Invoices

type InvoiceDoc = InvoiceFields & { id: string, _createdAt: string, _updatedAt: string }

function summaryOf(d: InvoiceDoc, byId: Map<string, { label: string, name: string }>): InvoiceSummary {
	const client = byId.get(d.clientId)
	return {
		id: d.id, number: d.number ?? null, status: d.status, client: { id: d.clientId, label: client?.label ?? '?', name: client?.name ?? '' },
		issueDate: d.issueDate ?? null, dueDate: d.dueDate ?? null, netTotalHt: d.netTotalHt, totalTtc: d.totalTtc,
		currency: d.currency, paidAt: d.paidAt ?? null, updatedAt: d._updatedAt
	}
}

function invoiceOf(d: InvoiceDoc, byId: Map<string, { label: string, name: string }>): Invoice {
	return {
		...summaryOf(d, byId),
		performanceStartDate: d.performanceStartDate ?? null, performanceEndDate: d.performanceEndDate ?? null,
		operationCategory: d.operationCategory, vatMention: d.vatMention ?? null, bankAccountId: d.bankAccountId ?? null,
		notes: d.notes ?? null, grossTotalHt: d.grossTotalHt, totalVat: d.totalVat, paymentMethod: d.paymentMethod ?? null,
		paymentReference: d.paymentReference ?? null, einvoicingStatus: d.einvoicingStatus ?? null, createdAt: d._createdAt,
		lines: (d.lines ?? []).map((l, i) => ({ id: String(i), ...l, description: l.description ?? null, unit: l.unit ?? null }))
	}
}

async function clientNames(): Promise<Map<string, { label: string, name: string }>> {
	return new Map((await clients.findAll()).map(c => [c.id, { label: c.label, name: c.name }]))
}

/** Drafts first, then the newest issued; each by issue date, newest first. */
export async function fetchInvoices(): Promise<InvoiceSummary[]> {
	const [list, names] = await Promise.all([invoices.findAll({ sort: 'status,-issueDate' }), clientNames()])
	const rank = (s: InvoiceStatus) => s === 'draft' ? 0 : 1
	return list
		.sort((a, b) => rank(a.status) - rank(b.status) || (b.issueDate ?? '').localeCompare(a.issueDate ?? '') || b._createdAt.localeCompare(a._createdAt))
		.map(d => summaryOf(d, names))
}

export async function fetchInvoice(id: string): Promise<Invoice> {
	const [doc, names] = await Promise.all([invoices.get(id), clientNames()])
	return invoiceOf(doc, names)
}

export async function fetchVatDefaults(clientId: string, operationCategory: OperationCategory): Promise<VatDefaults> {
	const [settings, client] = await Promise.all([fetchSettings(), clients.get(clientId)])
	const zone = vatZone(client.country ?? 'FR')
	const rule = vatRule(settings.vatRegime, zone, operationCategory)
	return { vatRegime: settings.vatRegime, vatZone: zone, vatRate: rule.rate, vatMention: rule.mention }
}

/** An invoice as stored: VAT defaults where the input leaves them null, the due date, the totals. */
async function invoiceFields(input: InvoiceInput, base: Partial<InvoiceFields> = {}): Promise<InvoiceFields> {
	const [settings, client] = await Promise.all([fetchSettings(), clients.get(input.clientId)])
	const rule = vatRule(settings.vatRegime, vatZone(client.country ?? 'FR'), input.operationCategory)
	const lines = input.lines.map(l => {
		const quantity = l.quantity.trim().replace(',', '.')
		const milli = quantityToMilli(quantity)
		if (milli === null) throw new Error(`Invalid quantity "${l.quantity}"`)
		const vatRate = l.vatRate ?? rule.rate
		const totals = lineTotals(milli, l.unitPrice, vatRate, l.discountRate)
		return {
			title: l.title.trim(), description: l.description?.trim() ? l.description : null, quantity,
			unit: l.unit?.trim() || null, unitPrice: l.unitPrice, vatRate, discountRate: l.discountRate,
			totals, totalHt: totals.net, vatAmount: totals.vat
		}
	})
	const gross = lines.reduce((sum, l) => sum + l.totals.gross, 0)
	const net = lines.reduce((sum, l) => sum + l.totalHt, 0)
	const vat = lines.reduce((sum, l) => sum + l.vatAmount, 0)
	const issueDate = input.issueDate || null
	return {
		status: 'draft', number: null, paidAt: null, paymentMethod: null, paymentReference: null, einvoicingStatus: null,
		currency: 'EUR',
		...base,
		clientId: input.clientId,
		issueDate,
		dueDate: input.dueDate || (issueDate ? addDays(issueDate, settings.paymentTermDays) : null),
		performanceStartDate: input.performanceStartDate || null,
		performanceEndDate: input.performanceEndDate || null,
		operationCategory: input.operationCategory,
		vatMention: input.vatMention === null ? rule.mention : (input.vatMention.trim() || null),
		bankAccountId: input.bankAccountId,
		notes: input.notes?.trim() ? input.notes : null,
		grossTotalHt: gross, netTotalHt: net, totalVat: vat, totalTtc: net + vat,
		lines: lines.map(({ totals: _totals, ...line }) => line)
	}
}

/** Issued invoices are immutable: corrections go through a credit note. */
async function draft(id: string): Promise<InvoiceDoc> {
	const doc = await invoices.get(id)
	if (doc.status !== 'draft') throw new Error('Issued invoices cannot be modified — create a credit note instead')
	return doc
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
	const saved = await invoices.create(await invoiceFields(input))
	return invoiceOf(saved, await clientNames())
}

export async function updateInvoice(id: string, input: InvoiceInput): Promise<Invoice> {
	const current = await draft(id)
	const saved = await invoices.replace(id, await invoiceFields(input, { currency: current.currency }))
	return invoiceOf(saved, await clientNames())
}

export async function deleteInvoice(id: string) {
	await draft(id)
	await invoices.remove(id)
	return { ok: true }
}

/** A new draft like it, issued today. */
export async function duplicateInvoice(id: string): Promise<Invoice> {
	const source = await invoices.get(id)
	return createInvoice({
		clientId: source.clientId,
		issueDate: today(),
		dueDate: null,
		performanceStartDate: null,
		performanceEndDate: null,
		operationCategory: source.operationCategory,
		vatMention: source.vatMention ?? '',
		bankAccountId: source.bankAccountId ?? null,
		notes: source.notes ?? null,
		lines: (source.lines ?? []).map(l => ({ title: l.title, description: l.description ?? null, quantity: l.quantity, unit: l.unit ?? null, unitPrice: l.unitPrice, vatRate: l.vatRate, discountRate: l.discountRate }))
	})
}
