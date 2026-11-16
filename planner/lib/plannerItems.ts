import type { PlannerEvent } from '../api/events'
import type { TimelineItem } from '@cxxi-lab/hubbyware-sdk'

/**
 * What the calendar renders per day: the planner's own events + generic timeline items
 * contributed by other hubbies (via the timeline capability). The planner never imports
 * a contributing hubby — a timeline item is fully agnostic.
 */
export type PlannerItem =
	| { kind: 'event'; event: PlannerEvent; date: Date }
	| { kind: 'timeline'; item: TimelineItem; date: Date }
