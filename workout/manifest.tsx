import { faChartLine, faClockRotateLeft, faDumbbell, faListCheck, faRepeat } from '@fortawesome/free-solid-svg-icons'
import { defineHubby, describe, type HubbyManifest, type TimelineItem } from '@cxxi-lab/hubbyware-sdk'
import info from './hubby.json'
import { WorkoutsPrograms } from './pages/WorkoutsPrograms'
import { WorkoutsHistory } from './pages/WorkoutsHistory'
import { WorkoutsGreasingGroove } from './pages/WorkoutsGreasingGroove'
import { WorkoutsStats } from './pages/WorkoutsStats'
import { fetchSessions, type WorkoutSessionSummary } from './api/workoutSessions'
import { WorkoutSessionModal } from './components/WorkoutSessionModal'
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

	// Planner's calendar: scheduled/performed sessions as dated items (the payload is only read
	// back below, by this hubby).
	contributes: {
		timeline: {
			async items(start, end) {
				const sessions = await fetchSessions(start, end)
				return sessions
					.filter(s => s.performedAt ?? s.scheduledAt)
					.map<TimelineItem>(s => ({
						id: `workout:${s.id}`,
						date: new Date((s.performedAt ?? s.scheduledAt) as string),
						title: s.programLabel,
						hubbyId: 'workout',
						href: '/workout/history',
						color: '#059669',
						payload: s
					}))
			},
			renderDetail(item, { onClose, onChanged }) {
				return (
					<WorkoutSessionModal
						mode="edit"
						session={item.payload as WorkoutSessionSummary}
						onClose={onClose}
						onSaved={onChanged}
					/>
				)
			}
		}
	}
}

// run isolated (client docs/plan-isolation.md): its frame runs this definition
export default defineHubby(workoutManifest)
