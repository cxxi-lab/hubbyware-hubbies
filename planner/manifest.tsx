import { faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { describe, type ModuleManifest } from '@cxxi-lab/hub-sdk'
import info from './module.json'
import { Planner } from './pages/Planner'
import './module.css'

export const plannerManifest: ModuleManifest = {
	id: 'planner',
	...describe(info),
	icon: faCalendarDays,
	navItems: [],
	routes: [{ path: '/planner', Component: Planner, persistent: true }]
}
