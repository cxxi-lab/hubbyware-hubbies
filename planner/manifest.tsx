import { faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { defineHubby, describe, type HubbyManifest } from '@cxxi-lab/hubbyware-sdk'
import info from './hubby.json'
import { Planner } from './pages/Planner'
import './hubby.css'
import { apiCreateEvent, apiDeleteEvent, apiListEvents, apiUpdateEvent } from './api/events'
import { fetchEventCategories } from './api/eventCategories'

export const plannerManifest: HubbyManifest = {
	id: 'planner',
	...describe(info),
	icon: faCalendarDays,
	navItems: [],
	routes: [{ path: '/planner', Component: Planner, persistent: true }]
}

// run isolated (client docs/plan-isolation.md): its frame runs this definition
export default defineHubby({
	...plannerManifest,
	// its API (api.json): the calendar for the other hubbies and an assistant
	api: {
		'events.list': apiListEvents,
		'events.create': apiCreateEvent,
		'events.update': apiUpdateEvent,
		'events.delete': apiDeleteEvent,
		'categories.list': async () => (await fetchEventCategories()).map(c => ({ name: c.name, color: c.color }))
	}
})
