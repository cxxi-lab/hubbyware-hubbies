import { collection } from '@cxxi-lab/hub-sdk'

// Workouts' programs: its `program` collection (hubbies/workout/models/program.json), through the
// hubbies' generic API.

export type ProgramExerciseType = 'warmup' | 'training'

export interface ProgramExercise {
	/** a stable key within the program (its type and position) */
	id: string
	type: ProgramExerciseType
	label: string
	series: string
	reps: string
	tempo: string | null
	note: string | null
	position: number
}

export interface ProgramSummary {
	id: string
	label: string
	warmupCount: number
	trainingCount: number
	createdAt: string
	updatedAt: string
}

export interface Program extends ProgramSummary {
	exercises: ProgramExercise[]
}

export interface ProgramExerciseInput {
	type: ProgramExerciseType
	label: string
	series: string
	reps: string
	tempo: string | null
	note: string | null
}

export interface ProgramWriteInput {
	label: string
	exercises: ProgramExerciseInput[]
}

/** The stored document (the model's fields). */
interface ProgramFields {
	label: string
	exercises: Array<Omit<ProgramExercise, 'id'>>
}

const programs = collection<ProgramFields>('workout', 'program')

function toProgram(doc: ProgramFields & { id: string, _createdAt: string, _updatedAt: string }): Program {
	const exercises = (doc.exercises ?? []).map(e => ({ ...e, id: `${e.type}-${e.position}` }))
	return {
		id: doc.id,
		label: doc.label,
		exercises,
		warmupCount: exercises.filter(e => e.type === 'warmup').length,
		trainingCount: exercises.filter(e => e.type === 'training').length,
		createdAt: doc._createdAt,
		updatedAt: doc._updatedAt
	}
}

/** Positions counted per type, in the order given (warm-ups and training each from 0). */
export function positioned<T extends { type: ProgramExerciseType }>(exercises: T[]): Array<T & { position: number }> {
	const next: Record<string, number> = {}
	return exercises.map(e => ({ ...e, position: next[e.type] = (next[e.type] ?? -1) + 1 }))
}

function toFields(input: ProgramWriteInput): ProgramFields {
	return {
		label: input.label,
		exercises: positioned(input.exercises).map(e => ({ ...e, tempo: e.tempo || null, note: e.note || null }))
	}
}

/** Most recently changed first. */
export async function fetchPrograms(): Promise<ProgramSummary[]> {
	return (await programs.findAll({ sort: '-_updatedAt' })).map(toProgram)
}

export async function fetchProgram(id: string): Promise<Program> {
	return toProgram(await programs.get(id))
}

export async function createProgram(input: ProgramWriteInput): Promise<Program> {
	return toProgram(await programs.create(toFields(input)))
}

export async function updateProgram(id: string, input: ProgramWriteInput): Promise<Program> {
	return toProgram(await programs.update(id, toFields(input)))
}

/** Its sessions keep their program's label (their link to it is emptied). */
export function deleteProgram(id: string) {
	return programs.remove(id)
}

export async function duplicateProgram(id: string): Promise<Program> {
	const source = await programs.get(id)
	return toProgram(await programs.create({ label: `${source.label} (copy)`, exercises: source.exercises }))
}
