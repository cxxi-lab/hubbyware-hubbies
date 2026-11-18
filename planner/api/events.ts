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

// --- its API for the other hubbies and an assistant (api.json) ---

/** An event as the API gives it: its category by name. */
export interface ApiEvent { id: string, title: string, startsAt: string, endsAt: string | null, allDay: boolean, description: string | null, category: string | null }

const apiEvent = (e: PlannerEvent): ApiEvent => ({ id: e.id, title: e.title, startsAt: e.startsAt, endsAt: e.endsAt, allDay: e.allDay, description: e.description, category: e.category?.name ?? null })

interface ApiInput { title?: string, startsAt?: string, endsAt?: string | null, allDay?: boolean, description?: string | null, category?: string | null }

function validDate(value: string, what: string): string {
	if (Number.isNaN(new Date(value).getTime())) throw new Error(`${what} is not a date: ${value}`)
	return value
}

async function categoryId(name: string | null | undefined): Promise<string | null> {
	if (!name) return null
	const found = (await fetchEventCategories()).find(c => c.name.toLowerCase() === name.trim().toLowerCase())
	if (!found) throw new Error(`no category "${name}" (categories.list gives them)`)
	return found.id
}

async function apiEventOf(id: string): Promise<ApiEvent> {
	const [d, categories] = await Promise.all([events.get(id), fetchEventCategories()])
	return apiEvent(event(d, new Map(categories.map(c => [c.id, c]))))
}

export async function apiListEvents({ from, to }: { from: string, to: string }): Promise<ApiEvent[]> {
	return (await fetchEvents(new Date(validDate(from, 'from')), new Date(validDate(to, 'to')))).map(apiEvent)
}

export async function apiCreateEvent(input: ApiInput & { title: string, startsAt: string }): Promise<ApiEvent> {
	validDate(input.startsAt, 'startsAt')
	if (input.endsAt) validDate(input.endsAt, 'endsAt')
	if (input.endsAt && new Date(input.endsAt) < new Date(input.startsAt)) throw new Error('endsAt is before startsAt')
	const doc = await events.create(fields({ title: input.title, startsAt: input.startsAt, endsAt: input.endsAt ?? null, allDay: input.allDay ?? false, description: input.description ?? null, categoryId: await categoryId(input.category) }))
	return apiEventOf(doc.id)
}

export async function apiUpdateEvent({ id, ...change }: ApiInput & { id: string }): Promise<ApiEvent> {
	const d = await events.get(id)
	const next: EventWriteInput = {
		title: change.title ?? d.title,
		startsAt: change.startsAt !== undefined ? validDate(change.startsAt, 'startsAt') : d.startsAt,
		endsAt: change.endsAt !== undefined ? (change.endsAt ? validDate(change.endsAt, 'endsAt') : null) : d.endsAt,
		allDay: change.allDay ?? d.allDay ?? false,
		description: change.description !== undefined ? change.description : d.description,
		categoryId: change.category !== undefined ? await categoryId(change.category) : d.categoryId
	}
	if (next.endsAt && new Date(next.endsAt) < new Date(next.startsAt)) throw new Error('endsAt is before startsAt')
	await events.replace(id, fields(next))
	return apiEventOf(id)
}

export async function apiDeleteEvent({ id }: { id: string }): Promise<{ deleted: boolean }> {
	await events.get(id)
	await events.remove(id)
	return { deleted: true }
}

export async function updateEvent(id: string, input: EventWriteInput): Promise<void> {
	await events.replace(id, fields(input))
}

export function deleteEvent(id: string) {
	return events.remove(id)
}
