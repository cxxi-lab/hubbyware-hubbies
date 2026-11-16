import { collection } from '@cxxi-lab/hubbyware-sdk'

// Planner's categories: its `category` collection (hubbies/planner/models/category.json).

export interface EventCategory {
	id: string
	name: string
	color: string
}

interface CategoryFields {
	name: string
	color: string
}

const categories = collection<CategoryFields>('planner', 'category')

const category = (d: CategoryFields & { id: string }): EventCategory => ({ id: d.id, name: d.name, color: d.color })

export function fetchEventCategories(): Promise<EventCategory[]> {
	return categories.findAll({ sort: 'name' }).then(list => list.map(category))
}

export function createEventCategory(input: { name: string; color: string }) {
	return categories.create(input).then(category)
}

export function updateEventCategory(id: string, input: { name: string; color: string }) {
	return categories.update(id, input).then(category)
}

/** Its events stay, without a category. */
export function deleteEventCategory(id: string) {
	return categories.remove(id)
}
