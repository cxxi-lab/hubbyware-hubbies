import { faChartLine, faClockRotateLeft, faDumbbell, faListCheck, faRepeat } from '@fortawesome/free-solid-svg-icons'
import { describe, type ModuleManifest, type TimelineItem } from '@cxxi-lab/hub-sdk'
import info from './module.json'
import { WorkoutsPrograms } from './pages/WorkoutsPrograms'
import { WorkoutsHistory } from './pages/WorkoutsHistory'
import { WorkoutsGreasingGroove } from './pages/WorkoutsGreasingGroove'
import { WorkoutsStats } from './pages/WorkoutsStats'
import { fetchSessions, type WorkoutSessionSummary } from './api/workoutSessions'
import { WorkoutSessionModal } from './components/WorkoutSessionModal'
import './module.css'

export const workoutManifest: ModuleManifest = {
	id: 'workout',
	...describe(info),
	icon: faDumbbell,
	navItems: [
		{ to: '/workouts/programs', label: 'Programs', icon: faListCheck },
		{ to: '/workouts/history', label: 'History', icon: faClockRotateLeft },
		{ to: '/workouts/greasing-groove', label: 'Greasing Groove', icon: faRepeat },
		{ to: '/workouts/stats', label: 'Stats', icon: faChartLine }
	],
	routes: [
		{ path: '/workouts/programs', Component: WorkoutsPrograms, persistent: true },
		{ path: '/workouts/history', Component: WorkoutsHistory, persistent: true },
		{ path: '/workouts/greasing-groove', Component: WorkoutsGreasingGroove, persistent: true },
		{ path: '/workouts/stats', Component: WorkoutsStats, persistent: true }
	],

	// Planner's calendar: scheduled/performed sessions as dated items (the payload is only read
	// back below, by this module).
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
						moduleId: 'workout',
						href: '/workouts/history',
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
