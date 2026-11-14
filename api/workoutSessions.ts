import { collection } from '@cxxi-lab/hub-sdk'
import { fetchProgram, positioned, type ProgramExerciseType } from './programs'

// Workouts' sessions: its `session` collection (hubbies/workout/models/session.json). `date` is
// the session's day (performed, else scheduled): kept by the module, the index the history and
// the calendar query.

export interface WorkoutSessionExercise {
	/** a stable key within the session (its type and position) */
	id: string
	type: ProgramExerciseType
	position: number
	label: string
	plannedSeries: string
	plannedReps: string
	plannedTempo: string | null
	plannedNote: string | null
	actualSeries: string
	actualReps: string
	actualTempo: string | null
	actualNote: string | null
	isExtra: boolean
	skipped: boolean
}

export interface WorkoutSessionSummary {
	id: string
	programId: string | null
	programLabel: string
	scheduledAt: string | null
	performedAt: string | null
	note: string | null
	exerciseCount: number
	createdAt: string
	updatedAt: string
}

export interface WorkoutSession extends WorkoutSessionSummary {
	exercises: WorkoutSessionExercise[]
}

export interface WorkoutSessionCreateInput {
	programId: string
	scheduledAt?: string | null
	performedAt?: string | null
	note?: string | null
}

export interface WorkoutSessionExerciseInput {
	type: ProgramExerciseType
	label: string
	plannedSeries: string
	plannedReps: string
	plannedTempo: string | null
	plannedNote: string | null
	actualSeries: string
	actualReps: string
	actualTempo: string | null
	actualNote: string | null
	isExtra: boolean
	skipped: boolean
}

export interface WorkoutSessionUpdateInput {
	scheduledAt: string | null
	performedAt: string | null
	note: string | null
	exercises: WorkoutSessionExerciseInput[]
}

interface SessionFields {
	programId: string | null
	programLabel: string
	scheduledAt: string | null
	performedAt: string | null
	date: string | null
	note: string | null
	exercises: Array<Omit<WorkoutSessionExercise, 'id'>>
}

const sessions = collection<SessionFields>('workout', 'session')

function toSession(doc: SessionFields & { id: string, _createdAt: string, _updatedAt: string }): WorkoutSession {
	const exercises = (doc.exercises ?? []).map(e => ({ ...e, id: `${e.type}-${e.position}` }))
	return {
		id: doc.id,
		programId: doc.programId,
		programLabel: doc.programLabel,
		scheduledAt: doc.scheduledAt,
		performedAt: doc.performedAt,
		note: doc.note,
		exercises,
		exerciseCount: exercises.length,
		createdAt: doc._createdAt,
		updatedAt: doc._updatedAt
	}
}

/**
 * The sessions whose day (performed, else scheduled) falls in [from, to], by day; without a
 * window, all of them, the latest created first.
 */
export async function fetchSessions(from?: Date, to?: Date): Promise<WorkoutSessionSummary[]> {
	const docs = from && to
		? await sessions.findAll({ filter: { date: { gte: from.toISOString(), lte: to.toISOString() } }, sort: 'date' })
		: await sessions.findAll({ sort: '-_createdAt' })
	return docs.map(toSession)
}

export async function fetchSession(id: string): Promise<WorkoutSession> {
	return toSession(await sessions.get(id))
}

/** A session from a program: its exercises copied as planned (and as done, to be adjusted). */
export async function createSession(input: WorkoutSessionCreateInput): Promise<WorkoutSession> {
	const program = await fetchProgram(input.programId)
	let scheduledAt = input.scheduledAt ?? null
	let performedAt = input.performedAt ?? null
	// neither date: done now
	if (!scheduledAt && !performedAt) performedAt = new Date().toISOString()
	return toSession(await sessions.create({
		programId: program.id,
		programLabel: program.label,
		scheduledAt,
		performedAt,
		date: performedAt ?? scheduledAt,
		note: input.note ?? null,
		exercises: program.exercises.map(e => ({
			type: e.type,
			position: e.position,
			label: e.label,
			plannedSeries: e.series,
			plannedReps: e.reps,
			plannedTempo: e.tempo,
			plannedNote: e.note,
			actualSeries: e.series,
			actualReps: e.reps,
			actualTempo: e.tempo,
			actualNote: e.note,
			isExtra: false,
			skipped: false
		}))
	}))
}

export async function updateSession(id: string, input: WorkoutSessionUpdateInput): Promise<WorkoutSession> {
	return toSession(await sessions.update(id, {
		scheduledAt: input.scheduledAt,
		performedAt: input.performedAt,
		date: input.performedAt ?? input.scheduledAt,
		note: input.note,
		exercises: positioned(input.exercises).map(e => ({ ...e, actualTempo: e.actualTempo || null, actualNote: e.actualNote || null }))
	}))
}

export function deleteSession(id: string) {
	return sessions.remove(id)
}
