import { faChartLine, faClockRotateLeft, faDumbbell, faListCheck, faRepeat } from '@fortawesome/free-solid-svg-icons'
import { workoutApi } from './api/assistant'
import { defineHubby, describe, type HubbyManifest, type TimelineEntry } from '@cxxi-lab/hubbyware-sdk'
import info from './hubby.json'
import { WorkoutsPrograms } from './pages/WorkoutsPrograms'
import { WorkoutsHistory } from './pages/WorkoutsHistory'
import { WorkoutsGreasingGroove } from './pages/WorkoutsGreasingGroove'
import { WorkoutsStats } from './pages/WorkoutsStats'
import { fetchSessions } from './api/workoutSessions'
import './hubby.css'

export const workoutManifest: HubbyManifest = {
	id: 'workout',
	...describe(info),
	icon: faDumbbell,
	navItems: [
		{ to: '/workout/programs', label: 'Programs', icon: faListCheck },
		{ to: '/workout/history', label: 'History', icon: faClockRotateLeft },
		{ to: '/workout/greasing-groove', label: 'Greasing Groove', icon: faRepeat },
		{ to: '/workout/stats', label: 'Stats', icon: faChartLine }
	],
	routes: [
		{ path: '/workout/programs', Component: WorkoutsPrograms, persistent: true },
		{ path: '/workout/history', Component: WorkoutsHistory, persistent: true },
		{ path: '/workout/greasing-groove', Component: WorkoutsGreasingGroove, persistent: true },
		{ path: '/workout/stats', Component: WorkoutsStats, persistent: true }
	],
}

// run isolated (client docs/plan-isolation.md): its frame runs this definition; its API (api.json,
// client docs/plan-api-hubbies.md): its sessions as a calendar's dated items (Planner shows them)
export default defineHubby({
	...workoutManifest,
	api: {
		...workoutApi,
		'timeline.items': async ({ start, end }: { start: string, end: string }): Promise<TimelineEntry[]> => {
			const sessions = await fetchSessions(new Date(start), new Date(end))
			return sessions.flatMap(s => {
				const date = s.performedAt ?? s.scheduledAt
				return date ? [{ id: s.id, date: new Date(date).toISOString(), title: s.programLabel, href: `/history?session=${encodeURIComponent(s.id)}`, color: '#059669' }] : []
			})
		}
	}
})
