// IBAN helpers (ported from the server): normalization, the mod-97 checksum, groups of 4.

export function normalizeIban(iban: string): string {
	return iban.replace(/\s+/g, '').toUpperCase()
}

export function isValidIban(iban: string): boolean {
	const value = normalizeIban(iban)
	if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value)) return false
	const digits = (value.slice(4) + value.slice(0, 4)).replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55))
	let remainder = 0
	for (let i = 0; i < digits.length; i += 7) remainder = Number(`${remainder}${digits.slice(i, i + 7)}`) % 97
	return remainder === 1
}

/** As on a RIB: groups of 4. */
export function formatIban(iban: string): string {
	return normalizeIban(iban).replace(/(.{4})/g, '$1 ').trim()
}

/** A BIC: 8 or 11 characters (bank, country, location, branch). */
export function isValidBic(bic: string): boolean {
	return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic.replace(/\s+/g, '').toUpperCase())
}
