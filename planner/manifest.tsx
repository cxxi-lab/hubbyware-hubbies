import { faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { defineHubby, describe, type HubbyManifest } from '@cxxi-lab/hubbyware-sdk'
import info from './hubby.json'
import { Planner } from './pages/Planner'
import './hubby.css'

export const plannerManifest: HubbyManifest = {
	id: 'planner',
	...describe(info),
	icon: faCalendarDays,
	navItems: [],
	routes: [{ path: '/planner', Component: Planner, persistent: true }]
}

// run isolated (client docs/plan-isolation.md): its frame runs this definition
export default defineHubby(plannerManifest)
