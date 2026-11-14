// Week starts on Monday. ISO-style day index: 0 = Monday, 6 = Sunday.

export function isoWeekday(d: Date): number {
	return (d.getDay() + 6) % 7
}

export function startOfDay(d: Date): Date {
	const c = new Date(d)
	c.setHours(0, 0, 0, 0)
	return c
}

export function isSameDay(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear()
		&& a.getMonth() === b.getMonth()
		&& a.getDate() === b.getDate()
}

export function addDays(d: Date, n: number): Date {
	const c = new Date(d)
	c.setDate(c.getDate() + n)
	return c
}

export function addMonths(d: Date, n: number): Date {
	const c = new Date(d)
	c.setMonth(c.getMonth() + n)
	return c
}

export function addYears(d: Date, n: number): Date {
	const c = new Date(d)
	c.setFullYear(c.getFullYear() + n)
	return c
}

export function startOfWeek(d: Date): Date {
	return addDays(startOfDay(d), -isoWeekday(d))
}

export function startOfMonth(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function startOfYear(d: Date): Date {
	return new Date(d.getFullYear(), 0, 1)
}

export function weekDays(anchor: Date): Date[] {
	const start = startOfWeek(anchor)
	return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/**
 * 6 weeks * 7 days = 42-cell grid that always contains the whole month.
 * Days outside the month are filled from the previous / next month so any
 * month renders into the same fixed shape.
 */
export function monthGrid(anchor: Date): Date[] {
	const first = startOfMonth(anchor)
	const start = startOfWeek(first)
	return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

const DAY_LABELS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_LABELS_NARROW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function dayLabel(index: number, variant: 'long' | 'short' | 'narrow' = 'short'): string {
	if (variant === 'long') return DAY_LABELS_LONG[index]
	if (variant === 'narrow') return DAY_LABELS_NARROW[index]
	return DAY_LABELS_SHORT[index]
}

const MONTH_FMT_LONG = new Intl.DateTimeFormat('en-US', { month: 'long' })
const MONTH_FMT_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short' })

export function monthLabel(d: Date, variant: 'long' | 'short' = 'long'): string {
	return (variant === 'long' ? MONTH_FMT_LONG : MONTH_FMT_SHORT).format(d)
}

const DATE_RANGE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

export function weekRangeLabel(anchor: Date): string {
	const start = startOfWeek(anchor)
	const end = addDays(start, 6)
	if (start.getMonth() === end.getMonth()) {
		return `${DATE_RANGE_FMT.format(start)} – ${end.getDate()}, ${end.getFullYear()}`
	}
	return `${DATE_RANGE_FMT.format(start)} – ${DATE_RANGE_FMT.format(end)}, ${end.getFullYear()}`
}

export function monthYearLabel(d: Date): string {
	return `${monthLabel(d, 'long')} ${d.getFullYear()}`
}

export function dayKey(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}
