import type { ReactNode } from 'react'

// Form bits of the Mail modals (same look as the Business and Workouts ones).

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

export function Field({ label, hint, children, className = '' }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
	return (
		<div className={`flex flex-col gap-1 ${className}`}>
			<label className="text-xs uppercase tracking-wide text-steel-400">{label}</label>
			{children}
			{hint && <span className="text-[11px] text-steel-500">{hint}</span>}
		</div>
	)
}

/** '' → null, trimmed otherwise. */
export function nullable(value: string | null | undefined): string | null {
	const trimmed = value?.trim() ?? ''
	return trimmed === '' ? null : trimmed
}
