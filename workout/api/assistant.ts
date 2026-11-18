import { createSession, fetchSession, fetchSessions, type WorkoutSession, type WorkoutSessionSummary } from './workoutSessions'
import { fetchProgram, fetchPrograms } from './programs'

// Workouts' API for the other hubbies and an assistant (api.json): programs and sessions, by name too.

const summary = (s: WorkoutSessionSummary) => ({ id: s.id, program: s.programLabel, scheduledAt: s.scheduledAt, performedAt: s.performedAt, note: s.note, exercises: s.exerciseCount })

function date(value: string, what: string): Date {
	const d = new Date(value)
	if (Number.isNaN(d.getTime())) throw new Error(`${what} is not a date: ${value}`)
	return d
}

/** A program by its id or its name. */
async function programId(program: string): Promise<string> {
	const all = await fetchPrograms()
	const found = all.find(p => p.id === program) ?? all.find(p => p.label.toLowerCase() === program.trim().toLowerCase())
	if (!found) throw new Error(`no program "${program}" (programs.list gives them: ${all.map(p => p.label).join(', ') || 'none'})`)
	return found.id
}

export const workoutApi = {
	'programs.list': async () => (await fetchPrograms()).map(p => ({ id: p.id, name: p.label, warmups: p.warmupCount, trainings: p.trainingCount })),
	'programs.get': async ({ program }: { program: string }) => {
		const p = await fetchProgram(await programId(program))
		return { id: p.id, name: p.label, exercises: p.exercises.map(e => ({ type: e.type, label: e.label, series: e.series, reps: e.reps, tempo: e.tempo, note: e.note })) }
	},
	'sessions.list': async ({ from, to }: { from: string, to: string }) => (await fetchSessions(date(from, 'from'), date(to, 'to'))).map(summary),
	'sessions.get': async ({ id }: { id: string }) => {
		const s: WorkoutSession = await fetchSession(id)
		return { ...summary(s), exercises: s.exercises.map(e => ({ type: e.type, label: e.label, planned: `${e.plannedSeries} × ${e.plannedReps}`, done: `${e.actualSeries} × ${e.actualReps}`, note: e.actualNote, skipped: e.skipped, extra: e.isExtra })) }
	},
	'sessions.create': async ({ program, scheduledAt, performedAt, note }: { program: string, scheduledAt?: string | null, performedAt?: string | null, note?: string | null }) => {
		if (scheduledAt) date(scheduledAt, 'scheduledAt')
		if (performedAt) date(performedAt, 'performedAt')
		return summary(await createSession({ programId: await programId(program), scheduledAt: scheduledAt ?? null, performedAt: performedAt ?? null, note: note ?? null }))
	}
}
