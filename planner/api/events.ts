import { collection } from '@cxxi-lab/hubbyware-sdk'
import { fetchEventCategories, type EventCategory } from './eventCategories'

// Planner's events: its `event` collection (hubbies/planner/models/event.json). `until` is the
// event's end, else its start: kept here, it makes "the events overlapping a window" two indexed
// filters (starts before the window ends, ends after it starts).

export interface PlannerEvent {
	id: string
	title: string
	description: string | null
	allDay: boolean
	startsAt: string
	endsAt: string | null
	category: EventCategory | null
}

export interface EventWriteInput {
	title: string
	description?: string | null
	categoryId?: string | null
	startsAt: string
	endsAt?: string | null
	allDay: boolean
}

interface EventFields {
	title: string
	description: string | null
	categoryId: string | null
	startsAt: string
	endsAt: string | null
	until: string
	allDay: boolean
}

const events = collection<EventFields>('planner', 'event')

function fields(input: EventWriteInput): EventFields {
	const startsAt = new Date(input.startsAt).toISOString()
	const endsAt = input.endsAt ? new Date(input.endsAt).toISOString() : null
	return {
		title: input.title,
		description: input.description || null,
		categoryId: input.categoryId ?? null,
		startsAt,
		endsAt,
		until: endsAt ?? startsAt,
		allDay: input.allDay
	}
}

function event(d: EventFields & { id: string }, categories: Map<string, EventCategory>): PlannerEvent {
	return {
		id: d.id,
		title: d.title,
		description: d.description ?? null,
		allDay: d.allDay ?? false,
		startsAt: d.startsAt,
		endsAt: d.endsAt ?? null,
		category: d.categoryId ? categories.get(d.categoryId) ?? null : null
	}
}

/** The events overlapping [from, to], by start. */
export async function fetchEvents(from: Date, to: Date): Promise<PlannerEvent[]> {
	const [list, categories] = await Promise.all([
		events.findAll({ filter: { startsAt: { lte: to.toISOString() }, until: { gte: from.toISOString() } }, sort: 'startsAt' }),
		fetchEventCategories()
	])
	const byId = new Map(categories.map(c => [c.id, c]))
	return list.map(d => event(d, byId))
}

export async function createEvent(input: EventWriteInput): Promise<void> {
	await events.create(fields(input))
}

export async function updateEvent(id: string, input: EventWriteInput): Promise<void> {
	await events.replace(id, fields(input))
}

export function deleteEvent(id: string) {
	return events.remove(id)
}
