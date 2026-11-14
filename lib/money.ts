// Integer-only money helpers, mirroring the server InvoiceCalculator (cents, basis
// points, quantities in thousandths, half-away-from-zero rounding per line).

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export function formatCents(cents: number): string {
	return eur.format(cents / 100)
}

/** "1 234,5" / "1234.50" → 123450 ; null when not a valid amount. */
export function parseAmount(input: string): number | null {
	const normalized = input.replace(/\s/g, '').replace(',', '.')
	const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
	if (!m) return null
	return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
}

/** 123450 → "1234.50" (editable form, no grouping). */
export function centsToInput(cents: number): string {
	return (cents / 100).toFixed(2)
}

/** 550 → "5.5" */
export function rateToInput(basisPoints: number): string {
	return String(basisPoints / 100)
}

/** "5,5" → 550 ; null when invalid or out of 0..100 %. */
export function parseRate(input: string): number | null {
	const normalized = input.trim().replace(',', '.')
	if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
	const bp = Math.round(Number(normalized) * 100)
	return bp <= 10000 ? bp : null
}

export function formatRate(basisPoints: number): string {
	return `${(basisPoints / 100).toLocaleString('fr-FR')} %`
}

/** "1.5" → 1500 ; null when not a positive decimal with ≤ 3 decimals. */
export function quantityToMilli(quantity: string): number | null {
	const m = /^(\d{1,7})(?:\.(\d{1,3}))?$/.exec(quantity.trim().replace(',', '.'))
	if (!m) return null
	return Number(m[1]) * 1000 + Number((m[2] ?? '').padEnd(3, '0'))
}

export function roundDiv(numerator: number, denominator: number): number {
	const sign = numerator < 0 ? -1 : 1
	return sign * Math.floor((Math.abs(numerator) * 2 + denominator) / (2 * denominator))
}

export interface LineTotals {
	gross: number
	net: number
	vat: number
}

export function lineTotals(quantityMilli: number, unitPrice: number, vatRate: number, discountRate: number): LineTotals {
	const gross = roundDiv(quantityMilli * unitPrice, 1000)
	const net = gross - roundDiv(gross * discountRate, 10000)
	return { gross, net, vat: roundDiv(net * vatRate, 10000) }
}
