import { faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { describe, type HubbyManifest } from '@cxxi-lab/hubbyware-sdk'
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
