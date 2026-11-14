import type { ReactNode } from 'react'

// Shared form bits for the Business modals/pages (same look as the Workouts modals).

export const inputClass =
	'w-full h-9 px-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 placeholder:text-steel-600 focus:outline-none focus:border-primary-500 disabled:opacity-50'

export const textareaClass =
	'w-full px-2 py-1.5 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 placeholder:text-steel-600 focus:outline-none focus:border-primary-500 resize-y'

export const secondaryButtonClass =
	'flex items-center gap-2 px-3 h-8 rounded text-steel-100 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer text-sm disabled:opacity-50'

export const primaryButtonClass =
	'flex items-center gap-2 px-3 h-8 rounded bg-primary-500 hover:bg-primary-300 text-steel-950 font-semibold border-0 cursor-pointer text-sm disabled:opacity-50'

export const dangerButtonClass =
	'flex items-center gap-2 px-3 h-8 rounded text-red-400 bg-transparent border border-red-400/40 hover:bg-red-400/10 cursor-pointer text-sm disabled:opacity-50'

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
	return (
		<div className={`flex flex-col gap-1 ${className}`}>
			<label className="text-xs uppercase tracking-wide text-steel-400">{label}</label>
			{children}
			{hint && <span className="text-[11px] text-steel-500">{hint}</span>}
		</div>
	)
}

export function SectionTitle({ children }: { children: ReactNode }) {
	return <h3 className="text-[10px] uppercase tracking-[1.5px] text-steel-500">{children}</h3>
}

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })

// FR first, then EU members, then the usual non-EU suspects.
const COUNTRY_CODES = [
	'FR', 'MC',
	'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'GR', 'HR', 'HU', 'IE', 'IT',
	'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
	'CA', 'US', 'GB', 'CH', 'NO', 'AU', 'JP', 'MA', 'TN', 'SN'
]

export function countryName(code: string): string {
	return countryNames.of(code) ?? code
}

export function CountrySelect({ value, onChange, allowEmpty = false }: { value: string | null; onChange: (code: string | null) => void; allowEmpty?: boolean }) {
	const codes = value && !COUNTRY_CODES.includes(value) ? [value, ...COUNTRY_CODES] : COUNTRY_CODES
	return (
		<select
			value={value ?? ''}
			onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
			className={inputClass}
		>
			{allowEmpty && <option value="">—</option>}
			{codes.map(code => (
				<option key={code} value={code}>{countryName(code)} ({code})</option>
			))}
		</select>
	)
}

/** '' → null, trimmed otherwise. */
export function nullable(value: string | null | undefined): string | null {
	const trimmed = value?.trim() ?? ''
	return trimmed === '' ? null : trimmed
}
