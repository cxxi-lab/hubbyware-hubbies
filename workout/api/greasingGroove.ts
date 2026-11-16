import { collection } from '@cxxi-lab/hubbyware-sdk'

// Greasing Groove's ideas: Workouts' `idea` collection (hubbies/workout/models/idea.json).

export interface GreasingGrooveExercise {
	id: string
	label: string
	note: string | null
	position: number
	createdAt: string
	updatedAt: string
}

export interface GreasingGrooveWriteInput {
	label: string
	note?: string | null
	position?: number | null
}

interface IdeaFields {
	label: string
	note: string | null
	position: number
}

const ideas = collection<IdeaFields>('workout', 'idea')

function toIdea(doc: IdeaFields & { id: string, _createdAt: string, _updatedAt: string }): GreasingGrooveExercise {
	return { id: doc.id, label: doc.label, note: doc.note, position: doc.position, createdAt: doc._createdAt, updatedAt: doc._updatedAt }
}

/** In their order (position, then the oldest first). */
export async function fetchGreasingGroove(): Promise<GreasingGrooveExercise[]> {
	const docs = await ideas.findAll({ sort: 'position' })
	return docs.map(toIdea).sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
}

/** At the end unless placed. */
export async function createGreasingGroove(input: GreasingGrooveWriteInput): Promise<GreasingGrooveExercise> {
	let position = input.position ?? null
	if (position === null) {
		const last = (await ideas.find({ sort: '-position', limit: 1 })).data[0]
		position = last ? last.position + 1 : 0
	}
	return toIdea(await ideas.create({ label: input.label, note: input.note || null, position }))
}

export async function updateGreasingGroove(id: string, input: GreasingGrooveWriteInput): Promise<GreasingGrooveExercise> {
	const data: Partial<IdeaFields> = { label: input.label }
	if (input.note !== undefined) data.note = input.note || null
	if (input.position !== undefined && input.position !== null) data.position = input.position
	return toIdea(await ideas.update(id, data))
}

export function deleteGreasingGroove(id: string) {
	return ideas.remove(id)
}
