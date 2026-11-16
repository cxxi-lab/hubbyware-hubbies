import type { OperationCategory, VatRegime, VatZone } from '../api/business'

// The single place where VAT rules live: (issuer regime, client zone, operation category) →
// default rate + legal mention (ported from the server's VatResolver). Every invoice line defaults
// to it and can be overridden by hand.
// ⚠️ To be validated by an accountant before relying on it (B2B vs B2C, EU distance-selling
// thresholds…). Mentions are invoice content, hence in French.

export const STANDARD_RATE = 2000
const FRANCHISE = 'TVA non applicable, art. 293 B du CGI'
const REVERSE_CHARGE = 'Autoliquidation par le preneur, art. 283-2 du CGI'
const INTRA_EU_GOODS = 'Exonération de TVA, art. 262 ter I du CGI'
const EXPORT_GOODS = 'Exonération de TVA, art. 262 I du CGI'
const SERVICES_OUTSIDE_FRANCE = 'TVA non applicable, art. 259-1 du CGI'

export interface VatRule {
	/** basis points (2000 = 20 %) */
	rate: number
	mention: string | null
}

/** EU member states other than France (ISO 3166-1 alpha-2). */
const EU_COUNTRIES = new Set(['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'])

/** Where a client sits for VAT purposes. Monaco counts as France; overseas departments are set by hand. */
export function vatZone(country: string): VatZone {
	const code = country.trim().toUpperCase()
	if (code === 'FR' || code === 'MC') return 'fr'
	return EU_COUNTRIES.has(code) ? 'eu' : 'non_eu'
}

export function vatRule(regime: VatRegime, zone: VatZone, category: OperationCategory): VatRule {
	if (regime === 'franchise') {
		// franchise: never any VAT; EU B2B services still fall under reverse charge
		return zone === 'eu' && category !== 'goods'
			? { rate: 0, mention: `${FRANCHISE} — ${REVERSE_CHARGE}` }
			: { rate: 0, mention: FRANCHISE }
	}
	if (zone === 'fr') return { rate: STANDARD_RATE, mention: null }
	if (zone === 'eu') return category === 'goods' ? { rate: 0, mention: INTRA_EU_GOODS } : { rate: 0, mention: REVERSE_CHARGE }
	return category === 'goods' ? { rate: 0, mention: EXPORT_GOODS } : { rate: 0, mention: SERVICES_OUTSIDE_FRANCE }
}
